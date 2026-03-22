
export interface Movie extends StartMovie{
  id: string;
}

export interface StartMovie {
  name: string;
  rating?: number;
  types: MovieType;
  genre: MovieGenre[];
  comment: string;
}

export interface MovieGenre {
  id: string;
  name: string;
}

export type MovieType = 'фильм' | 'сериал' | 'мультфильм';
