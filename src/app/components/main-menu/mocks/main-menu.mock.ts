import { MainWidget, UserInfo } from "../models/main-menu.model";

export const MainWidgetsMock: MainWidget[] = [
  {
    alias: 'home',
    id: '',
    order: 1,
    name: 'Дом',
    icon: 'home',
    size: 1,
    hide: false,
  },
  {
    alias: 'movies',
    id: '',
    order: 2,
    name: 'Кино',
    icon: 'movie',
    size: 2,
    hide: false,
  },
  {
    alias: 'books',
    id: '',
    order: 3,
    name: 'Книги',
    icon: 'book',
    size: 1,
    hide: false,
  },
  {
    alias: 'trips',
    id: '',
    order: 4,
    name: 'Путешествия',
    icon: 'public',
    size: 1,
    hide: false,
  },
  {
    alias: 'coins',
    id: '',
    order: 6,
    name: 'Монеты',
    icon: 'toll',
    size: 3,
    hide: false,
  },
  {
    alias: 'health',
    id: '',
    order: 7,
    name: 'Здоровье',
    icon: 'health_and_safety',
    size: 3,
    hide: false,
  }
];

export const UserInfoMock: UserInfo = {
  name: 'Kika'
};
