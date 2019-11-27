import React from 'react';

import {EventAttachment} from 'app/types';
import {t} from 'app/locale';
import GroupEventAttachmentsTableRow from 'app/views/organizationGroupDetails/groupEventAttachments/groupEventAttachmentsTableRow';

type Props = {
  attachments: EventAttachment[];
  orgId: string;
  projectId: string;
  groupId: string;
  onDelete: (url: string | null) => void;
};

class GroupEventAttachmentsTable extends React.Component<Props> {
  render() {
    const {attachments, orgId, projectId, groupId, onDelete} = this.props;
    const tableRowNames = [t('Name'), t('Type'), t('Size'), t('Actions')];

    return (
      <table className="table events-table">
        <thead>
          <tr>
            {tableRowNames.map(name => {
              return <th key={name}>{name}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {attachments.map(attachment => {
            return (
              <GroupEventAttachmentsTableRow
                key={attachment.id}
                attachment={attachment}
                orgId={orgId}
                projectId={projectId}
                groupId={groupId}
                onDelete={onDelete}
              />
            );
          })}
        </tbody>
      </table>
    );
  }
}

export default GroupEventAttachmentsTable;
