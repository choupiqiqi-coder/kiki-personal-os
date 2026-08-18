export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <p className="text-sm font-medium text-primary">Kiki Personal OS</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">当前处于离线状态</h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        请恢复网络连接后重试。AI 生成、数据同步和文件上传需要联网完成。
      </p>
    </main>
  );
}
