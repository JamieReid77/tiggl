import { render, screen } from '@testing-library/react';

import { Wordmark } from './Wordmark';

describe('Wordmark', () => {
  it('renders the Tiggl name', () => {
    render(<Wordmark />);

    expect(screen.getByText('Tiggl')).toBeInTheDocument();
  });

  it('renders as a heading when asked', () => {
    render(<Wordmark as="h1" />);

    expect(screen.getByRole('heading', { name: 'Tiggl' })).toBeInTheDocument();
  });

  it('renders the boxed badge', () => {
    const { container } = render(<Wordmark boxed />);

    expect(screen.getByText('Tiggl')).toHaveClass('bg-white');
    expect(container.querySelector('.bg-brand')).toBeTruthy();
  });
});
