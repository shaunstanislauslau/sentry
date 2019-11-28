import React from 'react';

import Link from 'app/components/links/link';
import {t} from 'app/locale';
import DateTime from 'app/components/dateTime';
import FileSize from 'app/components/fileSize';
import {EventAttachment} from 'app/types';
import AttachmentUrl from 'app/utils/attachmentUrl';
import EventAttachmentActions from 'app/components/events/eventAttachmentActions';

type Props = {
  orgId: string;
  projectId: string;
  groupId: string;
  attachment: EventAttachment;
  onDelete: (url: string) => void;
};

class GroupEventAttachmentsTableRow extends React.Component<Props> {
  getEventUrl() {
    const {attachment, orgId, groupId} = this.props;

    return `/organizations/${orgId}/issues/${groupId}/events/${attachment.event_id}/`;
  }

  getAttachmentTypeDisplayName(type: string) {
    const types = {
      'event.minidump': t('Minidump'),
      'event.applecrashreport': t('Apple Crash Report'),
      'event.attachment': t('Other'),
    };

    return types[type] || t('Other');
  }

  render() {
    const {attachment, projectId, onDelete} = this.props;

    return (
      <tr>
        <td>
          <h5>
            {attachment.name}
            <br />
            <small>
              <DateTime date={attachment.dateCreated} /> &middot;{' '}
              <Link to={this.getEventUrl()}>{attachment.event_id}</Link>
            </small>
          </h5>
        </td>

        <td>{this.getAttachmentTypeDisplayName(attachment.type)}</td>

        <td>
          <FileSize bytes={attachment.size} />
        </td>

        <td>
          <AttachmentUrl
            projectId={projectId}
            eventId={attachment.event_id}
            attachment={attachment}
          >
            {url => <EventAttachmentActions url={url} onDelete={onDelete} />}
          </AttachmentUrl>
        </td>
      </tr>
    );
  }
}

export default GroupEventAttachmentsTableRow;
