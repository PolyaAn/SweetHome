export interface MainWidget {
  id: string;
  order: number;
  name: string;
  icon: string;
  size: number;
  hide: boolean;
}
export interface UserInfo {
  name: string;
}

export enum MoveEnum {
  LEFT = 'left',
  RIGHT = 'right',
}
