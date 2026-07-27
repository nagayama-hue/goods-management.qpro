export interface Wrestler {
  id: string;
  name: string;
  /** 退団は削除でなくフラグ。過去のインセンティブ実績を保持するため */
  active: boolean;
  createdAt: string;
}
