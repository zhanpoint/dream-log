/**
 * 创建梦境页与登出等全页跳转之间的桥接：在卸载前将草稿写入 IndexedDB 并打「下次恢复」标记。
 */

type Persister = () => Promise<void>;

let persister: Persister | null = null;

export function setCreateDreamDraftPersister(fn: Persister | null) {
  persister = fn;
}

/** 登出等场景：若当前在创建页且已注册，则持久化草稿并标记下次进入时恢复 */
export async function persistCreateDraftForExternalExit(): Promise<void> {
  if (!persister) return;
  try {
    await persister();
  } catch {
    // ignore
  }
}
