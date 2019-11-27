import React from 'react';

import {t} from 'app/locale';
import SentryTypes from 'app/sentryTypes';
import SearchBar from 'app/components/searchBar';

import {Panel, PanelHeader, PanelBody} from 'app/components/panels';

import {SentryTransactionEvent} from './types';
import TraceView from './traceView';

type PropType = {
  event: SentryTransactionEvent;
};

type State = {
  searchQuery: string | undefined;
};

class SpansInterface extends React.Component<PropType, State> {
  static propTypes = {
    event: SentryTypes.Event.isRequired,
  };

  state: State = {
    searchQuery: undefined,
  };

  handleSpanFilter = (searchQuery: string) => {
    this.setState({
      searchQuery: searchQuery || undefined,
    });
  };

  render() {
    const {event} = this.props;

    return (
      <div>
        <SearchBar
          defaultQuery=""
          query={this.state.searchQuery || ''}
          placeholder={t('Filter on spans')}
          onSearch={this.handleSpanFilter}
        />
        <br />
        <Panel>
          <PanelHeader disablePadding={false} hasButtons={false}>
            {t('Trace View - This Transaction')}
          </PanelHeader>
          <PanelBody>
            <TraceView event={event} searchQuery={this.state.searchQuery} />
          </PanelBody>
        </Panel>
      </div>
    );
  }
}

export default SpansInterface;
