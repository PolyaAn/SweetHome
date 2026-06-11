import { WidgetVm } from '../models/home.model';
import { controlsByType, hasControls, sliderValue } from './home-widget-controls';

describe('home widget control rendering', () => {
  it('uses cover position slider value from current_position', () => {
    const widget = widgetVm({
      controls: [
        {type: 'button', action: 'open', label: 'Open'},
        {type: 'button', action: 'close', label: 'Close'},
        {type: 'slider', action: 'position', label: 'Position', min: 0, max: 100, step: 1, unit: '%'},
      ],
      attributes: {current_position: 45},
      displayType: 'cover',
      state: 'open',
    });

    const sliders = controlsByType(widget, 'slider');

    expect(sliders.length).toBe(1);
    expect(sliderValue(widget, sliders[0])).toBe(45);
  });

  it('does not create cover slider when catalog controls do not contain it', () => {
    const widget = widgetVm({
      controls: [
        {type: 'button', action: 'open', label: 'Open'},
        {type: 'button', action: 'close', label: 'Close'},
      ],
      displayType: 'cover',
      state: 'closed',
    });

    expect(controlsByType(widget, 'slider')).toEqual([]);
    expect(controlsByType(widget, 'button').map((control) => control.action)).toEqual(['open', 'close']);
  });

  it('returns no renderable controls when catalog item is missing', () => {
    const widget = widgetVm({
      catalogMatched: false,
      controls: [
        {type: 'toggle', action: 'toggle', label: 'Toggle'},
      ],
      displayType: null,
      state: 'unknown',
    });

    expect(hasControls(widget)).toBeFalse();
    expect(controlsByType(widget, 'toggle')).toEqual([]);
  });
});

function widgetVm(patch: Partial<WidgetVm>): WidgetVm {
  return {
    id: 'layout-widget-id',
    entityId: 'cover.living_room_curtains',
    type: 'cover',
    name: 'Curtains',
    icon: 'curtains',
    order: 1,
    size: 1,
    hide: false,
    roomId: 'living-room',
    settingsJson: '{}',
    state: 'unknown',
    unit: null,
    isSensor: false,
    isOnline: true,
    catalogMatched: true,
    updatedAt: null,
    capabilities: [],
    controls: [],
    displayType: null,
    attributes: {},
    ...patch,
  };
}
