import PropTypes from 'prop-types';
import React from 'react';
import styled from 'react-emotion';
import {Link} from 'react-router';
import flatten from 'lodash/flatten';

import {analytics} from 'app/utils/analytics';
import {sortArray} from 'app/utils';
import {t} from 'app/locale';
import {alertHighlight, pulse} from 'app/styles/animations';
import Button from 'app/components/button';
import ConfigStore from 'app/stores/configStore';
import InlineSvg from 'app/components/inlineSvg';
import BookmarkStar from 'app/components/projects/bookmarkStar';
import DropdownAutoComplete from 'app/components/dropdownAutoComplete';
import Feature from 'app/components/acl/feature';
import FeatureDisabled from 'app/components/acl/featureDisabled';
import GlobalSelectionHeaderRow from 'app/components/globalSelectionHeaderRow';
import Highlight from 'app/components/highlight';
import Hovercard from 'app/components/hovercard';
import IdBadge from 'app/components/idBadge';
import SentryTypes from 'app/sentryTypes';
import space from 'app/styles/space';
import theme from 'app/utils/theme';
import withProjects from 'app/utils/withProjects';

const renderDisabledCheckbox = p => (
  <Hovercard
    body={
      <FeatureDisabled
        features={p.features}
        hideHelpToggle
        message={t('Multiple project selection disabled')}
        featureName={t('Multiple Project Selection')}
      />
    }
  >
    {p.children}
  </Hovercard>
);

class ProjectSelector extends React.Component {
  static propTypes = {
    // Accepts a project id (slug) and not a project *object* because ProjectSelector
    // is created from Django templates, and only organization is serialized
    projectId: PropTypes.string,
    organization: PropTypes.object.isRequired,
    projects: PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.string, SentryTypes.Project])
    ),

    // used by multiProjectSelector
    multiProjects: PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.string, SentryTypes.Project])
    ),
    nonMemberProjects: PropTypes.arrayOf(SentryTypes.Project),

    // Render a footer at the bottom of the list
    // render function that is passed an `actions` object with `close` and `open` properties.
    menuFooter: PropTypes.func,

    // Allow selecting multiple projects?
    multi: PropTypes.bool,

    // Use this if the component should be a controlled component
    selectedProjects: PropTypes.arrayOf(SentryTypes.Project),

    // Callback when a project is selected
    onSelect: PropTypes.func,

    // Callback when the menu is closed
    onClose: PropTypes.func,

    // Callback when projects are selected via the multiple project selector
    // Calls back with (projects[], event)
    onMultiSelect: PropTypes.func,
    rootClassName: PropTypes.string,
  };

  static defaultProps = {
    projectId: null,
    multi: false,
    onSelect: () => {},
  };

  constructor(props) {
    super(props);

    this.state = {
      activeProject: this.getActiveProject(),
      selectedProjects: new Map(),
    };
  }

  urlPrefix() {
    return `/organizations/${this.props.organization.slug}`;
  }

  getActiveProject() {
    const {projectId} = this.props;
    const projects = flatten(this.getProjects());

    return projects.find(({slug}) => slug === projectId);
  }

  getProjects() {
    const {organization, projects, multiProjects, nonMemberProjects} = this.props;

    if (multiProjects) {
      return [
        sortArray(multiProjects, project => {
          return [!project.isBookmarked, project.name];
        }),
        nonMemberProjects || [],
      ];
    }

    // Legacy
    const {isSuperuser} = ConfigStore.get('user');
    const unfilteredProjects = projects || organization.projects;

    const filteredProjects = isSuperuser
      ? unfilteredProjects
      : unfilteredProjects.filter(project => project.isMember);

    return [
      sortArray(filteredProjects, project => {
        return [!project.isBookmarked, project.name];
      }),
      [],
    ];
  }

  isControlled = () => typeof this.props.selectedProjects !== 'undefined';

  toggleProject(project, e) {
    const {onMultiSelect} = this.props;
    const {slug} = project;
    // Don't update state if this is a controlled component
    if (this.isControlled()) {
      return;
    }

    this.setState(state => {
      const selectedProjects = new Map(state.selectedProjects.entries());

      if (selectedProjects.has(slug)) {
        selectedProjects.delete(slug);
      } else {
        selectedProjects.set(slug, project);
      }

      if (typeof onMultiSelect === 'function') {
        onMultiSelect(Array.from(selectedProjects.values()), e);
      }

      return {
        selectedProjects,
      };
    });
  }

  handleSelect = ({value: project}) => {
    const {onSelect} = this.props;

    this.setState({activeProject: project});
    onSelect(project);
  };

  handleMultiSelect = (project, e) => {
    const {onMultiSelect, selectedProjects} = this.props;
    const isControlled = this.isControlled();
    const hasCallback = typeof onMultiSelect === 'function';

    if (isControlled && !hasCallback) {
      // eslint-disable-next-line no-console
      console.error(
        'ProjectSelector is a controlled component but `onMultiSelect` callback is not defined'
      );
    }

    if (hasCallback) {
      if (isControlled) {
        const selectedProjectsMap = new Map(selectedProjects.map(p => [p.slug, p]));
        if (selectedProjectsMap.has(project.slug)) {
          // unselected a project

          selectedProjectsMap.delete(project.slug);
        } else {
          selectedProjectsMap.set(project.slug, project);
        }

        onMultiSelect(Array.from(selectedProjectsMap.values()), e);
      }
    }

    this.toggleProject(project, e);
  };

  render() {
    const {
      children,
      organization: org,
      menuFooter,
      multi,
      className,
      rootClassName,
      onClose,
    } = this.props;
    const {activeProject} = this.state;
    const access = new Set(org.access);

    const [projects, nonMemberProjects] = this.getProjects();

    const hasProjects =
      (projects && !!projects.length) ||
      (nonMemberProjects && !!nonMemberProjects.length);
    const hasProjectWrite = access.has('project:write');

    const getProjectItem = project => ({
      value: project,
      searchKey: project.slug,
      label: ({inputValue}) => (
        <ProjectSelectorItem
          project={project}
          organization={org}
          multi={multi}
          inputValue={inputValue}
          isChecked={
            this.isControlled()
              ? !!this.props.selectedProjects.find(({slug}) => slug === project.slug)
              : this.state.selectedProjects.has(project.slug)
          }
          style={{padding: 0}}
          onMultiSelect={this.handleMultiSelect}
        />
      ),
    });

    const projectList = hasProjects
      ? [
          {
            hideGroupLabel: true,
            items: projects.map(getProjectItem),
          },
          {
            hideGroupLabel: nonMemberProjects.length === 0,
            itemSize: 'small',
            id: 'no-membership-header', // needed for tests for non-virtualized lists
            label: <Label>{t("Projects I don't belong to")}</Label>,
            items: nonMemberProjects.map(getProjectItem),
          },
        ]
      : [];

    return (
      <DropdownAutoComplete
        alignMenu="left"
        allowActorToggle
        closeOnSelect
        blendCorner={false}
        searchPlaceholder={t('Filter projects')}
        onSelect={this.handleSelect}
        onClose={onClose}
        maxHeight={500}
        zIndex={theme.zIndex.dropdown}
        css={{marginTop: 6}}
        inputProps={{style: {padding: 8, paddingLeft: 10}}}
        rootClassName={rootClassName}
        className={className}
        emptyMessage={t('You have no projects')}
        noResultsMessage={t('No projects found')}
        virtualizedHeight={theme.headerSelectorRowHeight}
        virtualizedLabelHeight={theme.headerSelectorLabelHeight}
        emptyHidesInput
        inputActions={() => (
          <AddButton
            disabled={!hasProjectWrite}
            to={`/organizations/${org.slug}/projects/new/`}
            size="xsmall"
            title={
              hasProjectWrite ? null : t("You don't have permission to add a project")
            }
          >
            <StyledAddIcon src="icon-circle-add" /> {t('Project')}
          </AddButton>
        )}
        menuFooter={renderProps => {
          const renderedFooter =
            typeof menuFooter === 'function' ? menuFooter(renderProps) : menuFooter;
          const showCreateProjectButton = !hasProjects && hasProjectWrite;

          if (!renderedFooter && !showCreateProjectButton) {
            return null;
          }

          return (
            <React.Fragment>
              {showCreateProjectButton && (
                <CreateProjectButton
                  priority="primary"
                  size="small"
                  to={`${this.urlPrefix()}/projects/new/`}
                >
                  {t('Create project')}
                </CreateProjectButton>
              )}
              {renderedFooter}
            </React.Fragment>
          );
        }}
        items={projectList}
      >
        {renderProps =>
          children({
            ...renderProps,
            activeProject,
            selectedProjects: this.isControlled()
              ? this.props.selectedProjects
              : Array.from(this.state.selectedProjects.values()),
          })
        }
      </DropdownAutoComplete>
    );
  }
}

class ProjectSelectorItem extends React.PureComponent {
  static propTypes = {
    project: SentryTypes.Project.isRequired,
    organization: SentryTypes.Organization.isRequired,
    multi: PropTypes.bool,
    inputValue: PropTypes.string,
    isChecked: PropTypes.bool,
    onMultiSelect: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {
      bookmarkHasChanged: false,
    };
  }

  componentDidUpdate(nextProps) {
    if (nextProps.project.isBookmarked !== this.props.project.isBookmarked) {
      this.setBookmarkHasChanged();
    }
  }

  setBookmarkHasChanged() {
    this.setState({
      bookmarkHasChanged: true,
    });
  }

  handleMultiSelect = e => {
    const {project, onMultiSelect} = this.props;
    onMultiSelect(project, e);
  };

  handleClick = e => {
    e.stopPropagation();
    this.handleMultiSelect(e);
  };

  handleBookmarkToggle = isBookmarked => {
    analytics('projectselector.bookmark_toggle', {
      org_id: parseInt(this.props.organization.id, 10),
      bookmarked: isBookmarked,
    });
  };

  clearAnimation = () => {
    this.setState({bookmarkHasChanged: false});
  };

  render() {
    const {project, multi, inputValue, isChecked, organization} = this.props;

    return (
      <BadgeAndActionsWrapper
        bookmarkHasChanged={this.state.bookmarkHasChanged}
        onAnimationEnd={this.clearAnimation}
      >
        <GlobalSelectionHeaderRow
          checked={isChecked}
          onCheckClick={this.handleClick}
          multi={multi}
          priority="secondary"
          renderCheckbox={({checkbox}) => (
            <Feature
              features={['organizations:global-views']}
              hookName="feature-disabled:project-selector-checkbox"
              renderDisabled={renderDisabledCheckbox}
            >
              {checkbox}
            </Feature>
          )}
        >
          <BadgeWrapper multi={multi}>
            <IdBadge
              project={project}
              avatarSize={16}
              displayName={<Highlight text={inputValue}>{project.slug}</Highlight>}
              avatarProps={{consistentWidth: true}}
            />
          </BadgeWrapper>
          <StyledBookmarkStar
            project={project}
            organization={organization}
            bookmarkHasChanged={this.state.bookmarkHasChanged}
            onToggle={this.handleBookmarkToggle}
          />
          <SettingsIconLink
            to={`/settings/${organization.slug}/${project.slug}/`}
            onClick={e => e.stopPropagation()}
          >
            <SettingsIcon src="icon-settings" />
          </SettingsIconLink>
        </GlobalSelectionHeaderRow>
      </BadgeAndActionsWrapper>
    );
  }
}

const StyledBookmarkStar = styled(BookmarkStar)`
  padding: ${space(1)} ${space(0.5)};
  box-sizing: content-box;
  opacity: ${p => (p.project.isBookmarked ? 1 : 0.33)};
  transition: 0.5s opacity ease-out;
  display: block;
  width: 14px;
  height: 14px;
  margin-top: -${space(0.25)}; /* trivial alignment bump */
  animation: ${p => (p.bookmarkHasChanged ? `0.5s ${pulse(1.4)}` : 'none')};
`;

const CreateProjectButton = styled(Button)`
  display: block;
  text-align: center;
  margin: ${space(0.5)} 0;
`;

const AddButton = styled(Button)`
  display: block;
  margin: 0 ${space(1)};
  color: ${p => p.theme.gray2};

  &:hover {
    color: ${p => p.theme.gray3};
  }
`;

const BadgeWrapper = styled('div')`
  display: flex;
  flex: 1;
  ${p => !p.multi && 'flex: 1'};
  white-space: nowrap;
  overflow: hidden;
`;

const SettingsIconLink = styled(Link)`
  color: ${p => p.theme.gray2};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${space(1)} ${space(0.25)} ${space(1)} ${space(1)};
  opacity: 0.33;
  transition: 0.5s opacity ease-out;

  &:hover {
    color: ${p => p.theme.gray4};
  }
`;

const StyledAddIcon = styled(InlineSvg)`
  margin-right: ${space(0.5)};
`;

const SettingsIcon = styled(InlineSvg)`
  height: 16px;
  width: 16px;
`;

const Label = styled('div')`
  font-size: ${p => p.theme.fontSizeSmall};
  color: ${p => p.theme.gray2};
`;

const BadgeAndActionsWrapper = styled('div')`
  animation: ${p => (p.bookmarkHasChanged ? `1s ${alertHighlight('info')}` : 'none')};
  z-index: ${p => (p.bookmarkHasChanged ? 1 : 'inherit')};
  position: relative;
  border-style: solid;
  border-width: 1px 0;
  border-color: transparent;
  &:hover ${StyledBookmarkStar}, &:hover ${SettingsIconLink} {
    opacity: 1;
  }
`;

export default withProjects(ProjectSelector);
