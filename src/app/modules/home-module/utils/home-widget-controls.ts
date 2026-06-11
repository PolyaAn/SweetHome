import { HomeAssistantWidgetControl, WidgetVm } from '../models/home.model';

export function controlsByType(widget: WidgetVm, type: string): HomeAssistantWidgetControl[] {
  if (!widget.catalogMatched) {
    return [];
  }

  return widget.controls.filter((control) => control.type === type && !!control.action);
}

export function hasControls(widget: WidgetVm): boolean {
  return controlsByType(widget, 'button').length > 0
    || controlsByType(widget, 'toggle').length > 0
    || controlsByType(widget, 'slider').length > 0
    || controlsByType(widget, 'stepper').length > 0
    || controlsByType(widget, 'colorPicker').length > 0;
}

export function sliderValue(widget: WidgetVm, control: HomeAssistantWidgetControl): number {
  if (control.action === 'position') {
    return numberAttribute(widget, 'current_position') ?? 0;
  }

  return numberAttribute(widget, control.action)
    ?? numericState(widget.state)
    ?? control.min
    ?? 0;
}

export function isActiveWidgetState(state: string): boolean {
  return state === 'on' || state === 'open' || state === 'opening' || state === 'playing';
}

function numberAttribute(widget: WidgetVm, key: string): number | null {
  const value = widget.attributes?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function numericState(state: string): number | null {
  const value = Number(state);
  return Number.isFinite(value) ? value : null;
}
