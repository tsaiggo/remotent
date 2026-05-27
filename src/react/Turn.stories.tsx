import type { Meta, StoryObj } from '@storybook/react-vite';
import { Turn } from './Turn.js';
import type { Turn as TurnType } from '../types/index.js';

const TimelineFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="shell" style={{ display: 'block', height: 'auto' }}>
    <section className="canvas" style={{ display: 'block', padding: 0, gridTemplateRows: 'unset' }}>
      <ol className="timeline" style={{ padding: '24px 96px', maxWidth: 900 }}>
        {children}
      </ol>
    </section>
  </div>
);

const meta: Meta<typeof Turn> = {
  title: 'Hub / Turn',
  component: Turn,
  decorators: [
    (Story) => (
      <TimelineFrame>
        <Story />
      </TimelineFrame>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Turn>;

const human: TurnType = {
  kind: 'human',
  who: 'Wen',
  role: 'human',
  time: '02:14:06',
  text: 'Bring up the three nodes. Goal: replace the v1 ingest with the streaming runtime, keep packet loss under 0.01 %, and produce a migration brief by EOD.',
};

const agentDev: TurnType = {
  kind: 'agent',
  who: 'dev.node',
  role: 'agent · gpt-codex',
  roleClass: 'dev',
  node: 'dev',
  time: '02:14:12',
  tools: ['repo.read', 'shell'],
  text: 'Inspecting <code>services/ingest-v1</code>. The hot path is in <code>pipeline.go:142</code> — a single goroutine fans in 14 partitions. Proposing to split fan-in across N workers and replace the <em>at-least-once</em> ack with the new <em>exactly-once</em> primitive.',
  terminal: [
    { type: 'prompt', cmd: 'acp.tool/shell' },
    { type: 'line', text: '$ rg "fan_in" services/ingest-v1 -l' },
    {
      type: 'out',
      text: 'services/ingest-v1/pipeline.go\nservices/ingest-v1/internal/router.go',
    },
    { type: 'line', text: '$ go test ./services/ingest-v1/... -run Stream -count=1' },
    {
      type: 'out',
      text: 'ok   services/ingest-v1/internal     0.412s\nok   services/ingest-v1/pipeline     1.804s',
    },
    { type: 'stream', text: 'drafting patch' },
  ],
};

const agentDesign: TurnType = {
  kind: 'agent',
  who: 'design.node',
  role: 'agent · claude-opus',
  roleClass: 'design',
  node: 'design',
  time: '02:14:18',
  tools: ['figma.read'],
  text: 'Re-aligning the operator console to surface partition health as a first-class signal. Replacing the legacy donut with a hairline sparkline strip — same data, a tenth of the visual weight.',
  artifact: { caption: 'partition.health · last 60 min', meta: '▲ 4.2% · variance 0.011' },
};

const agentResearchQuiet: TurnType = {
  kind: 'agent',
  who: 'research.node',
  role: 'agent · gemini',
  node: 'research',
  time: '02:14:21',
  quiet: true,
  text: 'Surfaced 3 prior post-mortems on exactly-once delivery (Kafka 2.0, NATS JetStream, Pulsar). Citations queued — <a href="#">expand 3 refs</a>.',
};

const streaming: TurnType = {
  kind: 'agent',
  who: 'dev.node',
  role: 'streaming',
  roleClass: 'dev',
  node: 'dev',
  time: '02:14:33',
  streaming: true,
  text: '',
};

export const Human: Story = { args: { turn: human } };
export const AgentWithTerminal: Story = { args: { turn: agentDev } };
export const AgentWithArtifact: Story = { args: { turn: agentDesign } };
export const AgentQuiet: Story = { args: { turn: agentResearchQuiet } };
export const Streaming: Story = { args: { turn: streaming } };

export const Conversation: Story = {
  render: () => (
    <>
      <Turn turn={human} />
      <Turn turn={agentDev} />
      <Turn turn={agentDesign} />
      <Turn turn={agentResearchQuiet} />
      <Turn turn={streaming} />
    </>
  ),
};
