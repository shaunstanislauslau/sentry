import React from 'react';

import {Panel, PanelBody, PanelHeader} from 'app/components/panels';
import {t} from 'app/locale';
import TextField from 'app/views/settings/components/forms/textField';

class RuleNameForm extends React.PureComponent {
  render() {
    return (
      <Panel>
        <PanelHeader>{t('Give your rule a name')}</PanelHeader>
        <PanelBody>
          <TextField
            name={'name'}
            type={'text'}
            label={t('Rule Name')}
            help={t('Give your rule a name so it is easy to manage later')}
            placeholder={t('Something really bad happened')}
            required={true}
          />
        </PanelBody>
      </Panel>
    );
  }
}

export default RuleNameForm;
