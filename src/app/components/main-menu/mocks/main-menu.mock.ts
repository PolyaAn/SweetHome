import { MainWidget, UserInfo } from "../models/main-menu.model";

export const MainWidgetsMock: MainWidget[] = [
  {
    id: 'home',
    order: 1,
    name: 'Дом',
    icon: 'home',
    size: 1,
    hide: false,
  },
  {
    id: 'movies',
    order: 2,
    name: 'Кино',
    icon: 'movie',
    size: 2,
    hide: false,
  },
  {
    id: 'books',
    order: 3,
    name: 'Книги',
    icon: 'book',
    size: 1,
    hide: false,
  },
  {
    id: 'trips',
    order: 4,
    name: 'Путешествия',
    icon: 'public',
    size: 1,
    hide: false,
  },
  {
    id: 'coins',
    order: 6,
    name: 'Монеты',
    icon: 'toll',
    size: 3,
    hide: false,
  },
  {
    id: 'health',
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
