import { render, screen } from '@testing-library/react';

import { SiteFooter } from './SiteFooter';

describe('SiteFooter', () => {
  it('credits Tay Digital and shows the year', () => {
    render(<SiteFooter />);

    expect(screen.getByText('Tiggl')).toBeInTheDocument();
    expect(screen.getByText(/is an original game by/)).toBeInTheDocument();
    const tayDigital = screen.getByRole('link', { name: 'Tay Digital' });
    expect(tayDigital).toHaveAttribute('href', 'https://taydigital.co.uk');
    expect(tayDigital).toHaveAttribute('target', '_blank');
    expect(tayDigital).toHaveAttribute('rel', 'noopener noreferrer');
    expect(
      screen.getByText(new RegExp(`© ${new Date().getFullYear()}`)),
    ).toBeInTheDocument();
    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument();
    expect(screen.getByText(/v\d+\.\d+\.\d+/)).toBeInTheDocument();
  });
});
