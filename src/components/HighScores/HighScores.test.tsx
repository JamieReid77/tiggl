import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HighScores } from './HighScores';

import type { HighScore } from '@/lib/highScores';

const row: HighScore = {
  id: '1',
  playerName: 'JAMIE',
  score: 1234,
  level: 4,
  elapsedMs: 65_000,
  cleared: false,
  createdAt: '2026-09-01T00:00:00.000Z',
};

describe('HighScores', () => {
  it('renders a filled board row', () => {
    render(<HighScores rows={[row]} highlightId="1" />);

    expect(screen.getByText('JAMIE')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'High scores' }),
    ).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('JAMIE').closest('li')).toHaveClass(
      'tiggl-score-punch',
    );
  });

  it('shows the play count for the selected tab', () => {
    const { rerender } = render(
      <HighScores
        board="monthly"
        rows={[row]}
        plays={{ monthly: 12, allTime: 48 }}
      />,
    );

    expect(screen.getByLabelText('12 plays this month')).toBeInTheDocument();
    expect(screen.queryByText('48')).not.toBeInTheDocument();

    rerender(
      <HighScores
        board="allTime"
        rows={[row]}
        plays={{ monthly: 12, allTime: 48 }}
      />,
    );

    expect(screen.getByLabelText('48 plays all time')).toBeInTheDocument();
  });

  it('switches between this month and all time', async () => {
    const user = userEvent.setup();
    const onBoardChange = jest.fn();

    render(
      <HighScores board="monthly" rows={[row]} onBoardChange={onBoardChange} />,
    );

    expect(screen.getByText('This month')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Switch to all time' }),
    );
    expect(onBoardChange).toHaveBeenCalledWith('allTime');
  });

  it('fills the viewport width when fluid', () => {
    render(<HighScores fluid rows={[row]} />);

    expect(screen.getByRole('complementary')).toHaveClass('w-full');
    expect(screen.getByRole('complementary')).not.toHaveStyle({
      height: '800px',
    });
  });
});
