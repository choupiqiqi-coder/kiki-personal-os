import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateFundValuation, calculateLatestNavReturn } from "@/lib/finance/fund-calculations";
import type { FundNavData } from "@/server/market/types";
import { throwDataAccessError } from "./database-error";

export type FundHolding = {
  id:string;fund_code:string;fund_name:string;fund_type:string|null;benchmark:string|null;shares:number|null;
  manual_holding_amount:number|null;cost_basis:number;latest_nav:number|null;accumulated_nav:number|null;nav_date:string|null;
  daily_change_percent:number|null;latest_nav_return:number|null;market_value:number|null;cumulative_return:number|null;
  return_rate:number|null;quote_provider:string|null;quote_source:string|null;quote_fetched_at:string|null;
  association_status:"confirmed"|"unknown";tags:string[];notes:string|null;created_at:string;updated_at:string;
};
export type FundNavHistory = { nav_date:string;unit_nav:number;accumulated_nav:number|null;daily_change_percent:number|null;provider:string;source:string;fetched_at:string };
const fields="id,fund_code,fund_name,fund_type,benchmark,shares,manual_holding_amount,cost_basis,latest_nav,accumulated_nav,nav_date,daily_change_percent,latest_nav_return,market_value,cumulative_return,return_rate,quote_provider,quote_source,quote_fetched_at,association_status,tags,notes,created_at,updated_at";
const numberValue=(value:FormDataEntryValue|null)=>{const text=String(value??"").trim();if(text==="")return null;const number=Number(text);if(!Number.isFinite(number)||number<0)throw new Error("基金数字字段无效");return number};
const fail=(op:string,error:{message:string}|null)=>{if(error)throwDataAccessError(op,error)};

export function createFundsLiteData(client:SupabaseClient){return {
  async list(userId:string){const{data,error}=await client.from("finance_fund_holdings").select(fields).eq("user_id",userId).is("deleted_at",null).order("created_at",{ascending:false}).returns<FundHolding[]>();fail("funds.list",error);return data??[]},
  async get(userId:string,id:string):Promise<FundHolding>{const{data,error}=await client.from("finance_fund_holdings").select(fields).eq("user_id",userId).eq("id",id).is("deleted_at",null).single<FundHolding>();fail("funds.get",error);if(!data)throw new Error("基金不存在");return data},
  async save(userId:string,id:string|null,form:FormData){
    const code=String(form.get("fundCode")??"").trim();if(!/^\d{6}$/.test(code))throw new Error("基金代码必须是 6 位数字");
    const shares=numberValue(form.get("shares")),manualAmount=numberValue(form.get("holdingAmount")),cost=numberValue(form.get("costBasis"));
    if(shares==null&&manualAmount==null)throw new Error("请填写持有份额或当前持有金额");if(cost==null)throw new Error("请填写总投入金额");
    const current=id?await this.get(userId,id):null;
    const manualNav=numberValue(form.get("manualNav"));const manualDate=String(form.get("manualNavDate")??"").trim();
    if(manualNav!=null&&!/^\d{4}-\d{2}-\d{2}$/.test(manualDate))throw new Error("手动净值必须填写净值日期");
    const latestNav=manualNav??(current?.fund_code===code&&current.latest_nav!=null?Number(current.latest_nav):null);
    const valuation=calculateFundValuation({shares,manualHoldingAmount:manualAmount,costBasis:cost,latestNav});
    const row={
      user_id:userId,fund_code:code,fund_name:current?.fund_name||`基金 ${code}`,shares,manual_holding_amount:manualAmount,cost_basis:cost,
      tags:String(form.get("tags")??"").split(/[,，]/).map((tag)=>tag.trim()).filter(Boolean),
      notes:String(form.get("notes")??"").trim()||null,latest_nav:latestNav,market_value:valuation.marketValue,
      cumulative_return:valuation.cumulativeReturn,return_rate:valuation.returnRate,
      ...(manualNav!=null?{nav_date:manualDate,accumulated_nav:null,daily_change_percent:null,latest_nav_return:null,quote_provider:"manual",quote_source:"手动正式净值",quote_fetched_at:new Date().toISOString()}:{}),
    };
    const result=id?await client.from("finance_fund_holdings").update(row).eq("user_id",userId).eq("id",id).select("id").single():await client.from("finance_fund_holdings").insert(row).select("id").single();fail("funds.save",result.error);
    const savedId=result.data!.id as string;
    if(manualNav!=null){const saved=await client.from("finance_fund_nav_history").upsert({user_id:userId,holding_id:savedId,fund_code:code,nav_date:manualDate,unit_nav:manualNav,accumulated_nav:null,daily_change_percent:null,provider:"manual",source:"手动正式净值",fetched_at:new Date().toISOString()},{onConflict:"user_id,fund_code,nav_date"});fail("funds.manualNav",saved.error)}
    if(latestNav!=null){const history=await this.history(userId,savedId,2);const latestDate=manualDate||current?.nav_date||"";const previous=history.find((point)=>point.nav_date<latestDate);const latestNavReturn=calculateLatestNavReturn(shares,latestNav,previous?Number(previous.unit_nav):null);const recalculated=await client.from("finance_fund_holdings").update({latest_nav_return:latestNavReturn}).eq("user_id",userId).eq("id",savedId);fail("funds.latestNavReturn",recalculated.error)}
    return savedId;
  },
  async remove(userId:string,id:string){const{error}=await client.from("finance_fund_holdings").update({deleted_at:new Date().toISOString()}).eq("user_id",userId).eq("id",id);fail("funds.remove",error)},
  async applyNav(userId:string,id:string,nav:FundNavData){
    const current=await this.get(userId,id);
    if(nav.history.length){const rows=nav.history.map(point=>({user_id:userId,holding_id:id,fund_code:nav.code,nav_date:point.date,unit_nav:point.unitNav,accumulated_nav:point.accumulatedNav,daily_change_percent:point.dailyChangePercent,provider:nav.provider,source:nav.source,fetched_at:nav.fetchedAt}));const saved=await client.from("finance_fund_nav_history").upsert(rows,{onConflict:"user_id,fund_code,nav_date"});fail("funds.history",saved.error)}
    const history=await this.history(userId,id,2);const previous=history.find((point)=>point.nav_date<nav.latest.date);
    const shares=current.shares==null?null:Number(current.shares);
    const valuation=calculateFundValuation({shares,manualHoldingAmount:current.manual_holding_amount==null?null:Number(current.manual_holding_amount),costBasis:Number(current.cost_basis),latestNav:nav.latest.unitNav});
    const latestNavReturn=calculateLatestNavReturn(shares,nav.latest.unitNav,previous?Number(previous.unit_nav):null);
    const confirmed=Boolean(nav.benchmark);
    const update=await client.from("finance_fund_holdings").update({fund_name:nav.name||current.fund_name,fund_type:nav.fundType||current.fund_type,benchmark:nav.benchmark||current.benchmark,latest_nav:nav.latest.unitNav,accumulated_nav:nav.latest.accumulatedNav,nav_date:nav.latest.date,daily_change_percent:nav.latest.dailyChangePercent,latest_nav_return:latestNavReturn,market_value:valuation.marketValue,cumulative_return:valuation.cumulativeReturn,return_rate:valuation.returnRate,quote_provider:nav.provider,quote_source:nav.source,quote_fetched_at:nav.fetchedAt,association_status:confirmed?"confirmed":current.association_status}).eq("user_id",userId).eq("id",id);fail("funds.applyNav",update.error)
  },
  async history(userId:string,id:string,limit=90):Promise<FundNavHistory[]>{const{data,error}=await client.from("finance_fund_nav_history").select("nav_date,unit_nav,accumulated_nav,daily_change_percent,provider,source,fetched_at").eq("user_id",userId).eq("holding_id",id).order("nav_date",{ascending:false}).limit(limit).returns<FundNavHistory[]>();fail("funds.history.list",error);return data??[]}
};}
