import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, RawText, theme } from '@/ui';

let mockReduceMotion = false;
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduceMotion,
}));

function Sections(props: React.ComponentProps<typeof Accordion>) {
  return (
    <Accordion {...props}>
      {['a', 'b'].map((v) => (
        <AccordionItem key={v} value={v}>
          <AccordionTrigger testID={`trigger-${v}`}>{`Title ${v}`}</AccordionTrigger>
          <AccordionContent>
            <RawText>{`Body ${v}`}</RawText>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

const expanded = (v: string) => screen.getByTestId(`trigger-${v}`).props.accessibilityState?.expanded;

/** Lets the close animation (theme.duration.normal) finish so the content unmounts. */
const finishAnimation = () =>
  act(() => {
    jest.advanceTimersByTime(theme.duration.normal + 100);
  });

describe('Accordion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReduceMotion = false;
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts closed: button role, expanded false, 44 pt trigger, content not mounted', () => {
    render(<Sections type="single" collapsible />);
    const trigger = screen.getByTestId('trigger-a');
    expect(trigger.props.accessibilityRole).toBe('button');
    expect(expanded('a')).toBe(false);
    expect(StyleSheet.flatten(trigger.props.style)).toMatchObject({ minHeight: theme.minTouchTarget });
    expect(screen.queryByText('Body a')).toBeNull();
    expect(screen.getByText('Title a')).toBeOnTheScreen();
  });

  it('single: opening one item closes the other; a second press closes it (collapsible)', () => {
    const onValueChange = jest.fn();
    render(<Sections type="single" collapsible onValueChange={onValueChange} />);

    fireEvent.press(screen.getByTestId('trigger-a'));
    expect(expanded('a')).toBe(true);
    expect(screen.getByText('Body a')).toBeOnTheScreen();
    expect(onValueChange).toHaveBeenLastCalledWith('a');

    fireEvent.press(screen.getByTestId('trigger-b'));
    expect(expanded('a')).toBe(false);
    expect(expanded('b')).toBe(true);
    expect(screen.getByText('Body b')).toBeOnTheScreen();
    // While "a" animates closed it is hidden from assistive tech, then it unmounts.
    expect(screen.queryByText('Body a')).toBeNull();
    expect(screen.getByText('Body a', { includeHiddenElements: true })).toBeTruthy();
    finishAnimation();
    expect(screen.queryByText('Body a', { includeHiddenElements: true })).toBeNull();

    fireEvent.press(screen.getByTestId('trigger-b'));
    expect(expanded('b')).toBe(false);
    expect(onValueChange).toHaveBeenLastCalledWith('');
    finishAnimation();
    expect(screen.queryByText('Body b', { includeHiddenElements: true })).toBeNull();
  });

  it('single without collapsible keeps the open item open', () => {
    render(<Sections type="single" defaultValue="a" />);
    expect(expanded('a')).toBe(true);
    fireEvent.press(screen.getByTestId('trigger-a'));
    expect(expanded('a')).toBe(true);
  });

  it('multiple: items open independently', () => {
    const onValueChange = jest.fn();
    render(<Sections type="multiple" onValueChange={onValueChange} />);
    fireEvent.press(screen.getByTestId('trigger-a'));
    fireEvent.press(screen.getByTestId('trigger-b'));
    expect(expanded('a')).toBe(true);
    expect(expanded('b')).toBe(true);
    expect(onValueChange).toHaveBeenLastCalledWith(['a', 'b']);
    fireEvent.press(screen.getByTestId('trigger-a'));
    expect(onValueChange).toHaveBeenLastCalledWith(['b']);
    expect(expanded('a')).toBe(false);
  });

  it('controlled: follows `value`, not its own state', () => {
    const onValueChange = jest.fn();
    const { rerender } = render(<Sections type="single" collapsible value="" onValueChange={onValueChange} />);
    fireEvent.press(screen.getByTestId('trigger-a'));
    expect(onValueChange).toHaveBeenCalledWith('a');
    expect(expanded('a')).toBe(false);
    rerender(<Sections type="single" collapsible value="a" onValueChange={onValueChange} />);
    expect(expanded('a')).toBe(true);
  });

  it('reduce motion: closing unmounts the content at once', () => {
    mockReduceMotion = true;
    render(<Sections type="single" collapsible />);
    fireEvent.press(screen.getByTestId('trigger-a'));
    expect(screen.getByText('Body a')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('trigger-a'));
    expect(screen.queryByText('Body a', { includeHiddenElements: true })).toBeNull();
  });

  it('throws outside an Accordion', () => {
    jest.spyOn(console, 'error').mockImplementation(jest.fn());
    expect(() => render(<AccordionItem value="x" />)).toThrow(/inside its Accordion parent/);
  });
});
