import {Route} from 'react-router';
import {
  User,
  Organization,
  Project,
  IntegrationProvider,
  IntegrationFeature,
} from 'app/types';

// XXX(epurkhiser): A Note about `_`.
//
// We add the `_: any` type int our hooks list to stop
// typescript from doing too much type tightening. We should absolutely revisit
// this in the future because all callbacks _should_ be allowed to be
// functions, but doing so causes some unexpected issues and makes typescript
// not happy. We still get a huge advantage of typing just by having each hook
// type here however.

/**
 * The Hooks type mapping is the master interface for all external Hooks into
 * the sentry frontent application.
 */
export type Hooks = {_: any} & RouteHooks &
  ComponentHooks &
  CustomizationHooks &
  AnalyticsHooks &
  FeatureDisabledHooks &
  InterfaceChromeHooks &
  OnboardingHooks &
  SettingsHooks;

export type HookName = keyof Hooks;

/**
 * Route hooks.
 */
export type RouteHooks = {
  routes: RoutesHook;
  'routes:admin': RoutesHook;
  'routes:organization': RoutesHook;
  'routes:organization-root': RoutesHook;
};

/**
 * Component wrapping hooks
 */
export type ComponentHooks = {
  'component:org-members-view': GenericComponentHook;
  'component:header-date-range': GenericComponentHook;
  'component:header-selector-items': GenericComponentHook;
};

/**
 * Customization hooks are advanced hooks that return render-prop style
 * components the allow for specific customizations of components.
 *
 * These are very similar to the component wrapping hooks
 */
export type CustomizationHooks = {
  'integrations:feature-gates': IntegrationsFeatureGatesHook;
  'member-invite-modal:customization': InviteModalCustomizationHook;
};

/**
 * Analytics / tracking / and operational metrics backend hooks.
 */
export type AnalyticsHooks = {
  'analytics:init-user': AnalyticsInitUser;
  'analytics:track-event': AnalyticsTrackEvent;
  'analytics:track-adhoc-event': AnalyticsTrackAdhocEvent;
  'analytics:log-experiment': AnalyticsLogExperiment;
  'metrics:event': MetricsEvent;

  // TODO(epurkhiser): This is deprecated and should be replaced
  'analytics:event': LegacyAnalyticsEvent;
};

/**
 * feature-disabled:<feature-flag> hooks return components that will be
 * rendered in place for Feature components when the feature is not enabled.
 */
export type FeatureDisabledHooks = {
  'feature-disabled:custom-inbound-filters': FeatureDisabledHook;
  'feature-disabled:discard-groups': FeatureDisabledHook;
  'feature-disabled:data-forwarding': FeatureDisabledHook;
  'feature-disabled:rate-limits': FeatureDisabledHook;
  'feature-disabled:sso-basic': FeatureDisabledHook;
  'feature-disabled:sso-rippling': FeatureDisabledHook;
  'feature-disabled:sso-saml2': FeatureDisabledHook;
  'feature-disabled:events-page': FeatureDisabledHook;
  'feature-disabled:events-sidebar-item': FeatureDisabledHook;
  'feature-disabled:discover-page': FeatureDisabledHook;
  'feature-disabled:discover-sidebar-item': FeatureDisabledHook;
  'feature-disabled:project-selector-checkbox': FeatureDisabledHook;
  'feature-disabled:custom-symbol-sources': FeatureDisabledHook;
};

/**
 * Interface chrome hooks.
 */
export type InterfaceChromeHooks = {
  footer: GenericComponentHook;
  'organization:header': GenericOrganizationComponentHook;
  'sidebar:help-menu': GenericOrganizationComponentHook;
  'sidebar:organization-dropdown-menu': GenericOrganizationComponentHook;
  'sidebar:bottom-items': SidebarBottomItemsHook;
  'sidebar:item-label': SidebarItemLabelHook;
};

/**
 * Onboarding experience hooks
 */
export type OnboardingHooks = {
  'onboarding:invite-members': OnboardingInviteMembersHook;
  'onboarding:extra-chrome': GenericComponentHook;
};

/**
 * Settings navigation hooks.
 */
export type SettingsHooks = {
  'settings:organization-navigation': GenericOrganizationComponentHook;
  'settings:organization-navigation-config': SettingsConfigHook;
};

/**
 * Renders a React node.
 */
type GenericComponentHook = () => React.ReactNode;

/**
 * A route hook provides an injection point for a list of routes.
 */
type RoutesHook = () => Route[];

/**
 * Receives an organization object and should return a React node.
 */
type GenericOrganizationComponentHook = (opts: {
  organization: Organization;
}) => React.ReactNode;

/**
 * A FeatureDisabledHook returns a react element when a feature is not enabled.
 */
type FeatureDisabledHook = (opts: {
  /**
   * The organization that is associated to this feature.
   */
  organization: Organization;
  /**
   * The project that is associated to this feature.
   */
  project: Project;
  /**
   * The list of features that are controlled by this hook.
   */
  features: string[];
  /**
   * Weather the feature is or is not enabled.
   */
  hasFeature: boolean;
}) => React.ReactNode;

/**
 * Called when the app is mounted.
 */
type AnalyticsInitUser = (user: User) => void;

/**
 * Trigger analytics tracking in the hook store.
 */
type AnalyticsTrackEvent = (opts: {
  /**
   * The key used to identify the event.
   */
  eventKey: string;
  /**
   * The English string used as the name of the event.
   */
  eventName: string;
  /**
   * Arbitrary data to track
   */
  [key: string]: any;
}) => void;

/**
 * Trigger adhoc analytics tracking in the hook store.
 */
type AnalyticsTrackAdhocEvent = (
  opts: Omit<Parameters<AnalyticsTrackEvent>[0], 'eventName'>
) => void;

/**
 * Trigger experiment observed logging.
 */
type AnalyticsLogExperiment = (opts: {
  /**
   * The organiation with the experiment
   */
  organization: Organization;
  /**
   * The experiment key
   */
  key: string;
  /**
   * The name of the exposed unit
   */
  unitName: string;
  /**
   * The value of the unit to group by
   */
  unitId: string | number;
  /**
   * The parameter name used for the exposed key
   */
  param: string;
}) => void;

/**
 * Trigger analytics tracking in the hook store.
 *
 * Prefer using `analytics:track-event` or `analytics:track-adhock-event`.
 *
 * @deprecated This is the legacy interface.
 */
type LegacyAnalyticsEvent = (
  /**
   * The key used to identify the event.
   */
  name: string,
  /**
   * Arbitrary data to track
   */
  data: {[key: string]: number | string | boolean}
) => void;

/**
 * Trigger recording a metric in the hook store.
 */
type MetricsEvent = (
  /**
   * Metric name
   */
  name: string,
  /**
   * Value to record for this metric
   */
  value: number,
  /**
   * An additional tags object
   */
  tags?: object
) => void;

/**
 * Provides additional setting configurations
 *
 * TODO(ts): The returned object should come from a settings configuration type
 * once we convert settings configurations into typescript.
 */
type SettingsConfigHook = (opts: {
  organization: Organization;
}) => {
  name: string;
  items: object[];
};

/**
 * Each sidebar label is wrapped with this hook, to allow sidebar item
 * augmentation.
 */
type SidebarItemLabelHook = (opts: {
  /**
   * The key of the item label currently being rendered.
   */
  id: string;
}) => React.ReactNode;

/**
 * Returns an additional list of sidebar items.
 *
 * TODO(ts): These types should likely come from the Sidebar.tsx itself once it
 * is converted to typescript.
 */
type SidebarBottomItemsHook = (opts: {
  organization: Organization;
  /**
   * The current orientation of the sidebar.
   */
  orientation: 'top' | 'left';
  /**
   * Is the sidebar collapsed.
   */
  collapsed: boolean;
  /**
   * Does the sidebar currently have a panel displayed.
   */
  hasPanel: boolean;
}) => React.ReactNode;

/**
 * Wrapper component to allow for customization of the onboarding member
 * invitation component.
 */
type OnboardingInviteMembersHook = () => React.ComponentType<{
  organization: Organization;
}>;

type IntegrationFeatureGroup = {
  /**
   * The list of features within this group
   */
  features: IntegrationFeature[];
  /**
   * Weather the group has all of the features enabled within this group
   * or not.
   */
  hasFeatures: boolean;
};

type FeatureGateSharedProps = {
  /**
   * Organization of the integration we're querying feature gate details for.
   */
  organization: Organization;
  /**
   * The list of features, typically this is provided by the backend.
   */
  features: IntegrationFeature[];
};

type IntegrationFeaturesProps = FeatureGateSharedProps & {
  /**
   * The children function which will be provided with gating details.
   */
  children: (opts: {
    /**
     * This is the list of features which have *not* been gated in any way.
     */
    ungatedFeatures: IntegrationFeature[];
    /**
     * Features grouped based on specific gating criteria (for example, in
     * sentry.io this is features grouped by plans).
     */
    gatedFeatureGroups: IntegrationFeatureGroup[];
    /**
     * Is the integration disabled for installation because of feature gating?
     */
    disabled: boolean;
    /**
     * The translated reason that the integration is disabled.
     */
    disabledReason: React.ReactNode;
  }) => React.ReactElement;
};

type IntegrationFeatureListProps = FeatureGateSharedProps & {
  provider: Pick<IntegrationProvider, 'key'>;
};

/**
 * The integration features gate hook provides components to customize
 * integration feature lists.
 */
type IntegrationsFeatureGatesHook = () => {
  /**
   * This is a render-prop style component that given a set of integration
   * features will call the children function with gating details about the
   * features.
   */
  IntegrationFeatures: React.ComponentType<IntegrationFeaturesProps>;
  /**
   * This component renders the list of integration features.
   */
  FeatureList: React.ComponentType<IntegrationFeatureListProps>;
};

/**
 * Invite Modal customization allows for a render-prop component to add
 * additional react elements into the modal, and add invite-send middleware.
 */
type InviteModalCustomizationHook = () => React.ComponentType<{
  /**
   * The organization that members will be invited to.
   */
  organization: Organization;
  /**
   * Indicates if clicking 'send invites' will immediately send invites, or
   * would just create invite requests.
   */
  willInvite: boolean;
  /**
   * When the children's sendInvites renderProp is called, this will also be
   * triggered.
   */
  onSendInvites: () => void;
  children: (opts: {
    /**
     * Additional react elements to render in the header of the modal, just
     * under the description.
     */
    headerInfo?: React.ReactNode;
    /**
     * Indicates that the modal's send invites button should be enabled and
     * invites may currently be sent.
     */
    canSend: boolean;
    /**
     * Trigger sending invites
     */
    sendInvites: () => void;
  }) => React.ReactElement;
}>;
