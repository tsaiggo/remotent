import type { Meta, StoryObj } from '@storybook/react-vite';
import { Composer } from './Composer.js';

const ComposerFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="shell" style={{ display: 'block', height: 'auto' }}>
    <section className="canvas" style={{ display: 'block', padding: 0, gridTemplateRows: 'unset' }}>
      {children}
    </section>
  </div>
);

const noop = (): void => undefined;

const meta: Meta<typeof Composer> = {
  title: 'Hub / Composer',
  component: Composer,
  decorators: [
    (Story) => (
      <ComposerFrame>
        <Story />
      </ComposerFrame>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Composer>;

export const Default: Story = {
  args: { appendTurn: noop },
};
