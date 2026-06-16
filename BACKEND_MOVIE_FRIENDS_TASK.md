```text
Задача: доступ к фильмам друзей

1. Поиск друзей
- Реализовать `GET /api/v1/movies/friends`.
- Запрос принимает `query`.
- Ответ содержит только пользователей с включённым доступом к списку фильмов.
- Поиск выполняется по нику.
- Ответ возвращает массив `items`.
- Элемент массива содержит:
  - `userId: string`
  - `nickname: string`
  - `moviesCount: number`
- Ответ возвращает `total`.

2. Настройка доступа к своему списку
- Реализовать `GET /api/v1/movies/friends/share-settings`.
- Ответ возвращает `shareMovies: boolean`.
- Реализовать `PUT /api/v1/movies/friends/share-settings`.
- Тело запроса:
  - `shareMovies: boolean`
- Ответ возвращает актуальное значение `shareMovies`.

3. Список фильмов друга
- Реализовать `GET /api/v1/movies/friends/{friendUserId}`.
- Доступ открыт только к пользователю с `shareMovies = true`.
- Запрос принимает `page`.
- Запрос принимает `pageSize`.
- Ответ возвращает:
  - `ownerUserId: string`
  - `ownerNickname: string`
  - `items: SharedMovieListItemVm[]`
  - `page: number`
  - `pageSize: number`
  - `total: number`
  - `hasNext: boolean`
- `SharedMovieListItemVm` содержит:
  - `movieId: string`
  - `title: string`
  - `contentType: 'MOVIE' | 'CARTOON' | 'SERIES' | 'ANIME' | 'DORAMA'`
  - `rating: number | null`
  - `genres: string[]`
  - `country: string | null`
  - `comment: string | null`
  - `createdAt: string`
  - `updatedAt: string`
  - `ownerUserId: string`
  - `ownerNickname: string`
  - `isInMyList: boolean`

4. Добавление фильма друга в свой список
- Реализовать `POST /api/v1/movies/friends/import`.
- Тело запроса:
  - `sourceMovieId: string`
- Фильм копируется в список текущего пользователя.
- Повторное добавление одного и того же фильма отражается через `isInMyList = true` в списке фильмов друга.
- Ответ возвращает:
  - `movieId: string`

5. Ошибки доступа
- `GET /api/v1/movies/friends/{friendUserId}` возвращает `404`, если пользователь не найден.
- `GET /api/v1/movies/friends/{friendUserId}` возвращает `403`, если доступ к списку пользователя закрыт.
- `POST /api/v1/movies/friends/import` возвращает `404`, если исходный фильм не найден.
- `POST /api/v1/movies/friends/import` возвращает `403`, если владелец фильма закрыл доступ.

Открытые вопросы
- Правило копирования комментария и рейтинга при импорте фильма.
- Политика дедупликации импортированного фильма в списке текущего пользователя.
- Состав полей пользователя для поиска при совпадении ников.
```
