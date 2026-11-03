import { Injectable } from '@angular/core';
import { WardrobeCategory, WardrobeStyle } from '../models/wardrobe.model';

/**
 * Состояние экранов гардероба на время сессии: при возврате на список или подбор
 * пользователь видит те же фильтры, повод и погоду, что выбрал раньше.
 */
@Injectable()
export class WardrobeStateService {
  list: { searchQuery: string; category: WardrobeCategory | null; onlyFavorites: boolean } = {
    searchQuery: '',
    category: null,
    onlyFavorites: false,
  };

  picker: { occasion: WardrobeStyle; temperature: number } | null = null;
}
