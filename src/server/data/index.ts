import { createClient } from "@/lib/supabase/server";
import { getArtifact, getLatestRun, getRun, listArtifactsByType, listRecentAiArtifacts } from "./ai-artifacts";
import { getContentOverview } from "./content";
import { createContentStudio } from "./content-studio";
import {
  getDailyReview,
  getOrCreateDailyPage,
  listFocusItems,
  replaceTaskFocusItems,
  saveDailyReview,
  saveMorningState,
  applyDailyEvent,
  replaceFocusItems,
} from "./daily";
import { createHealthData, getHealthSummary } from "./health";
import { createLearningData } from "./learning";
import { createFinanceData } from "./finance";
import { createFundsLiteData } from "./funds-lite";
import { createFundTrendsData } from "./fund-trends";
import { getProfile,updateProfileLite } from "./profiles";
import {listMemories,setMemoryStatus} from "./memory";
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  setTaskCompleted,
  updateTask,
} from "./tasks";

export async function createDataAccess() {
  const client = await createClient();
  const studio = createContentStudio(client);
  const learning = createLearningData(client);
  const healthData = createHealthData(client);
  const finance = createFinanceData(client);
  const funds = createFundsLiteData(client);
  const fundTrends = createFundTrendsData(client);

  return {
    profiles: {
      get: (userId: string) => getProfile(client, userId),
      updateLite:(userId:string,input:Parameters<typeof updateProfileLite>[2])=>updateProfileLite(client,userId,input),
    },
    memory:{list:(userId:string)=>listMemories(client,userId),setStatus:(userId:string,id:string,status:Parameters<typeof setMemoryStatus>[3])=>setMemoryStatus(client,userId,id,status)},
    tasks: {
      list: (userId: string, scheduledDate?: string) =>
        listTasks(client, { userId, scheduledDate }),
      get: (userId: string, taskId: string) => getTask(client, userId, taskId),
      create: (userId: string, input: Parameters<typeof createTask>[2]) =>
        createTask(client, userId, input),
      update: (userId: string, taskId: string, input: Parameters<typeof updateTask>[3]) =>
        updateTask(client, userId, taskId, input),
      setCompleted: (userId: string, taskId: string, completed: boolean) =>
        setTaskCompleted(client, userId, taskId, completed),
      delete: (userId: string, taskId: string) => deleteTask(client, userId, taskId),
    },
    daily: {
      getOrCreate: (userId: string, date: string) =>
        getOrCreateDailyPage(client, userId, date),
      listFocus: (userId: string, dailyPageId: string) =>
        listFocusItems(client, userId, dailyPageId),
      replaceTaskFocus: (
        userId: string,
        dailyPageId: string,
        items: Array<{ taskId: string; title: string }>,
      ) => replaceTaskFocusItems(client, userId, dailyPageId, items),
      getReview: (userId: string, dailyPageId: string) =>
        getDailyReview(client, userId, dailyPageId),
      saveReview: (
        userId: string,
        dailyPageId: string,
        input: Parameters<typeof saveDailyReview>[3],
      ) => saveDailyReview(client, userId, dailyPageId, input),
      saveMorning:(userId:string,dailyPageId:string,input:Parameters<typeof saveMorningState>[3])=>saveMorningState(client,userId,dailyPageId,input),
      transition:(userId:string,dailyPageId:string,event:Parameters<typeof applyDailyEvent>[3])=>applyDailyEvent(client,userId,dailyPageId,event),
      replaceFocus:(userId:string,dailyPageId:string,items:Parameters<typeof replaceFocusItems>[3])=>replaceFocusItems(client,userId,dailyPageId,items),
    },
    aiArtifacts: {
      listRecent: (userId: string, limit?: number) =>
        listRecentAiArtifacts(client, userId, limit),
      listByType: (userId:string,type:string) => listArtifactsByType(client,userId,type),
      get: (userId:string,id:string) => getArtifact(client,userId,id),
      getRun: (userId:string,id:string) => getRun(client,userId,id),
      getLatestRun: (userId:string) => getLatestRun(client,userId),
    },
    content: {
      getOverview: (userId: string) => getContentOverview(client, userId),
      ...studio,
    },
    health: {
      getSummary: (
        userId: string,
        dayStart: string,
        dayEnd: string,
        date: string,
      ) => getHealthSummary(client, userId, dayStart, dayEnd, date),
      ...healthData,
    },
    learning,
    finance,
    funds,
    fundTrends,
  };
}
