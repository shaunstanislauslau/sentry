import React from 'react';
import pick from 'lodash/pick';

import {Panel, PanelBody} from 'app/components/panels';
import {t} from 'app/locale';
import withApi from 'app/utils/withApi';
import EmptyStateWarning from 'app/components/emptyStateWarning';
import GroupEventAttachmentsTable from 'app/views/organizationGroupDetails/groupEventAttachments/groupEventAttachmentsTable';
import GroupEventAttachmentsFilter from 'app/views/organizationGroupDetails/groupEventAttachments/groupEventAttachmentsFilter';
import LoadingError from 'app/components/loadingError';
import LoadingIndicator from 'app/components/loadingIndicator';
import Pagination from 'app/components/pagination';
import parseApiError from 'app/utils/parseApiError';
import GroupStore from 'app/stores/groupStore';
import {RouterProps, EventAttachment, Group} from 'app/types';
import {Client} from 'app/api';
import {deleteEventAttachment} from 'app/actionCreators/group';
import Feature from 'app/components/acl/feature';
import FeatureDisabled from 'app/components/acl/featureDisabled';

type Props = RouterProps & {
  api: Client;
  group: Group;
};

type State = {
  eventAttachmentsList: EventAttachment[];
  loading: boolean;
  error: null | string;
  pageLinks: null | string;
};

class GroupEventAttachments extends React.Component<Props, State> {
  state = {eventAttachmentsList: [], loading: true, error: null, pageLinks: null};

  componentWillMount() {
    this.fetchData();
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.location.search !== prevProps.location.search) {
      this.fetchData();
    }
  }

  handleDelete = async (url: string) => {
    const {api} = this.props;

    this.setState({
      loading: true,
    });

    try {
      await deleteEventAttachment(api, url);
      this.fetchData();
    } catch (_err) {
      // TODO: Error-handling
    }
  };

  fetchData = () => {
    this.setState({
      loading: true,
      error: null,
    });

    const query = {
      ...pick(this.props.location.query, ['cursor', 'environment', 'types']),
      limit: 50,
    };

    this.props.api.request(`/issues/${this.props.params.groupId}/attachments/`, {
      query,
      method: 'GET',
      success: (data, _, jqXHR) => {
        this.setState(prevState => ({
          eventAttachmentsList: data,
          error: null,
          loading: false,
          pageLinks: jqXHR ? jqXHR.getResponseHeader('Link') : prevState.pageLinks,
        }));
        GroupStore.updateEventAttachmentsCount(data.length, this.props.params.groupId);
      },
      error: err => {
        this.setState({
          error: parseApiError(err),
          loading: false,
        });
      },
    });
  };

  renderNoQueryResults() {
    return (
      <EmptyStateWarning>
        <p>{t('Sorry, no event attachments match your search query.')}</p>
      </EmptyStateWarning>
    );
  }

  renderEmpty() {
    return (
      <EmptyStateWarning>
        <p>{t("There don't seem to be any event attachments yet.")}</p>
      </EmptyStateWarning>
    );
  }

  renderResults() {
    const {group, params} = this.props;

    return (
      <GroupEventAttachmentsTable
        attachments={this.state.eventAttachmentsList}
        orgId={params.orgId}
        projectId={group.project.slug}
        groupId={params.groupId}
        onDelete={this.handleDelete}
      />
    );
  }

  renderBody() {
    let body;

    if (this.state.loading) {
      body = <LoadingIndicator />;
    } else if (this.state.error) {
      body = <LoadingError message={this.state.error} onRetry={this.fetchData} />;
    } else if (this.state.eventAttachmentsList.length > 0) {
      body = this.renderResults();
    } else if (this.props.location.query.types) {
      body = this.renderNoQueryResults();
    } else {
      body = this.renderEmpty();
    }

    return body;
  }

  render() {
    return (
      <Feature
        features={['event-attachments']}
        renderDisabled={() => <FeatureDisabled />}
      >
        <GroupEventAttachmentsFilter />
        <Panel className="event-list">
          <PanelBody>{this.renderBody()}</PanelBody>
        </Panel>
        <Pagination pageLinks={this.state.pageLinks} />
      </Feature>
    );
  }
}

export {GroupEventAttachments};

export default withApi(GroupEventAttachments);
