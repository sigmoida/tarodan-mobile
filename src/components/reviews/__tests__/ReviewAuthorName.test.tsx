import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

import { ReviewAuthorName } from '../ReviewAuthorName';

it('yorumcunun adına basınca profiline gider (şikayet/engelleme orada)', () => {
  render(<ReviewAuthorName review={{ userId: 'u1' }} name="Ayşe" />);
  fireEvent.press(screen.getByTestId('review-author-link'));
  expect(mockPush).toHaveBeenCalledWith('/seller/u1');
});

it('yazar kimliği yoksa bağlantı yok', () => {
  render(<ReviewAuthorName review={{}} name="Ayşe" />);
  expect(screen.queryByTestId('review-author-link')).toBeNull();
  expect(screen.getByText('Ayşe')).toBeTruthy();
});
