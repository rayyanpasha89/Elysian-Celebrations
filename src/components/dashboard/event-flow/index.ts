/**
 * Event-flow primitives — a premium flowchart / event-map visual language for
 * the planner. Presentational + controlled; not yet wired into client/wedding.
 *
 * Hierarchy: FlowNode("day") → FlowConnector → FlowNode("event") → StepOrbit.
 * FlowEmptyState covers the "no map yet" state.
 */

export {
  FlowNode,
  StatusBadge,
  FLOW_STATUS_META,
  type FlowNodeProps,
  type FlowStatus,
  type FlowNodeVariant,
} from "./flow-node";

export {
  FlowConnector,
  type FlowConnectorProps,
  type FlowConnectorOrientation,
  type FlowConnectorTone,
} from "./flow-connector";

export { StepOrbit, type StepOrbitProps, type FlowStep } from "./step-orbit";

export { FlowEmptyState, type FlowEmptyStateProps } from "./flow-empty-state";

export { MindMapLegend } from "./mind-map-legend";

export { MindMapGuide, type MindMapGuideProps } from "./mind-map-guide";
