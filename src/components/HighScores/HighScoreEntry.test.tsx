import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HighScoreEntry } from './HighScoreEntry';

describe('HighScoreEntry', () => {
  it('blocks a rude name before save', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(
      <HighScoreEntry
        offer={{ board: 'monthly', rank: 4 }}
        onSave={onSave}
        onSkip={() => {}}
      />,
    );

    await user.type(
      screen.getByLabelText('You made the top five for this month'),
      'fuck',
    );
    await user.keyboard('{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Choose a different name',
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('labels an all time top ten', () => {
    render(
      <HighScoreEntry
        offer={{ board: 'allTime', rank: 1 }}
        onSave={() => {}}
        onSkip={() => {}}
      />,
    );

    expect(
      screen.getByLabelText('You made the ALL TIME top ten'),
    ).toBeInTheDocument();
  });
});
