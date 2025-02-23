import React from 'react';
import {mountWithTheme} from 'sentry-test/enzyme';

import SavedQueryButtonGroup from 'app/views/eventsV2/savedQuery';
import {ALL_VIEWS} from 'app/views/eventsV2/data';
import EventView from 'app/views/eventsV2/eventView';
import * as utils from 'app/views/eventsV2/savedQuery/utils';

const SELECTOR_BUTTON_SAVE_AS = 'ButtonSaveAs';
const SELECTOR_BUTTON_SAVED = 'ButtonSaved';
const SELECTOR_BUTTON_UPDATE = '[data-test-id="discover2-savedquery-button-update"]';
const SELECTOR_BUTTON_DELETE = '[data-test-id="discover2-savedquery-button-delete"]';

function generateWrappedComponent(
  location,
  organization,
  eventView,
  savedQueries,
  onQueryChange
) {
  return mountWithTheme(
    <SavedQueryButtonGroup
      location={location}
      organization={organization}
      eventView={eventView}
      savedQueries={savedQueries}
      onQueryChange={onQueryChange}
    />,
    TestStubs.routerContext()
  );
}

describe('EventsV2 > SaveQueryButtonGroup', function() {
  // Organization + Location does not affect state in this component
  const organization = TestStubs.Organization();
  const location = {
    pathname: '/organization/eventsv2/',
    query: {},
  };

  const errorsQuery = ALL_VIEWS.find(view => view.name === 'Errors');
  const errorsView = EventView.fromSavedQuery(errorsQuery);

  const errorsViewSaved = EventView.fromSavedQuery(errorsQuery);
  errorsViewSaved.id = '1';

  const errorsViewModified = EventView.fromSavedQuery(errorsQuery);
  errorsViewModified.id = '1';
  errorsViewModified.name = 'Modified Name';
  errorsViewModified.fields[0].title = 'Modified Field Name';

  const errorsSavedQuery = errorsViewSaved.toNewQuery();
  const savedQueries = [errorsSavedQuery];

  describe('building on a new query', () => {
    let onQueryChange;
    const mockUtils = jest
      .spyOn(utils, 'handleCreateQuery')
      .mockImplementation(() => Promise.resolve(errorsSavedQuery));

    beforeEach(() => {
      onQueryChange = jest.fn();
      mockUtils.mockClear();
    });

    it('renders the correct set of buttons', () => {
      const wrapper = generateWrappedComponent(
        location,
        organization,
        errorsView,
        savedQueries,
        onQueryChange
      );

      const buttonSaveAs = wrapper.find(SELECTOR_BUTTON_SAVE_AS);
      const buttonSaved = wrapper.find(SELECTOR_BUTTON_SAVED);
      const buttonUpdate = wrapper.find(SELECTOR_BUTTON_UPDATE);
      const buttonDelete = wrapper.find(SELECTOR_BUTTON_DELETE);

      expect(buttonSaveAs.exists()).toBe(true);
      expect(buttonSaved.exists()).toBe(false);
      expect(buttonUpdate.exists()).toBe(false);
      expect(buttonDelete.exists()).toBe(false);
    });

    it('saves a well-formed query', async () => {
      const wrapper = generateWrappedComponent(
        location,
        organization,
        errorsView,
        savedQueries,
        onQueryChange
      );

      // Click on ButtonSaveAs to open dropdown
      const buttonSaveAs = wrapper.find('DropdownControl').first();
      buttonSaveAs.simulate('click');

      // Fill in the Input
      buttonSaveAs
        .find('ButtonSaveInput')
        .simulate('change', {target: {value: 'My New Query Name'}}); // currentTarget.value does not work
      await tick();

      // Click on Save in the Dropdown
      await buttonSaveAs.find('ButtonSaveDropDown Button').simulate('click');

      expect(mockUtils).toHaveBeenCalledWith(
        expect.anything(), // api
        organization,
        expect.objectContaining({
          ...errorsView,
          name: 'My New Query Name',
        }),
        true
      );
      expect(onQueryChange).toHaveBeenCalled();
    });

    it('rejects if query.name is empty', async () => {
      const wrapper = generateWrappedComponent(
        location,
        organization,
        errorsView,
        savedQueries,
        onQueryChange
      );

      // Click on ButtonSaveAs to open dropdown
      const buttonSaveAs = wrapper.find('DropdownControl').first();
      buttonSaveAs.simulate('click');

      // Do not fill in Input
      await tick();

      // Click on Save in the Dropdown
      buttonSaveAs.find('ButtonSaveDropDown Button').simulate('click');

      // Check that EventView has a name
      expect(errorsView.name).toBe('Errors');

      /**
       * This does not work because SavedQueryButtonGroup is wrapped by 2 HOCs
       * and we cannot access the state of the inner component. But it should
       * be empty because we didn't fill in Input. If it has a value, then the
       * test will fail anyway
       */
      // expect(wrapper.state('queryName')).toBe('');

      expect(mockUtils).not.toHaveBeenCalled();
      expect(onQueryChange).not.toHaveBeenCalled();
    });
  });

  describe('viewing a saved query', () => {
    let mockUtils, onQueryChange;

    beforeEach(() => {
      mockUtils = jest
        .spyOn(utils, 'handleDeleteQuery')
        .mockImplementation(() => Promise.resolve(errorsSavedQuery));
      onQueryChange = jest.fn();
    });

    afterEach(() => {
      mockUtils.mockClear();
    });

    it('renders the correct set of buttons', () => {
      const wrapper = generateWrappedComponent(
        location,
        organization,
        errorsViewSaved,
        savedQueries,
        onQueryChange
      );

      const buttonSaveAs = wrapper.find(SELECTOR_BUTTON_SAVE_AS);
      const buttonSaved = wrapper.find(SELECTOR_BUTTON_SAVED);
      const buttonUpdate = wrapper.find(SELECTOR_BUTTON_UPDATE);
      const buttonDelete = wrapper.find(SELECTOR_BUTTON_DELETE);

      expect(buttonSaveAs.exists()).toBe(false);
      expect(buttonSaved.exists()).toBe(true);
      expect(buttonUpdate.exists()).toBe(false);
      expect(buttonDelete.exists()).toBe(true);
    });

    it('deletes the saved query', async () => {
      const wrapper = generateWrappedComponent(
        location,
        organization,
        errorsViewSaved,
        savedQueries,
        onQueryChange
      );

      const buttonDelete = wrapper.find(SELECTOR_BUTTON_DELETE).first();
      await buttonDelete.simulate('click');

      expect(mockUtils).toHaveBeenCalledWith(
        expect.anything(), // api
        organization,
        expect.objectContaining({id: '1'})
      );
      expect(onQueryChange).toHaveBeenCalled();
    });
  });

  describe('modifying a saved query', () => {
    let mockUtils, onQueryChange;

    it('renders the correct set of buttons', () => {
      const wrapper = generateWrappedComponent(
        location,
        organization,
        errorsViewModified,
        [errorsViewSaved.toNewQuery()],
        onQueryChange
      );

      const buttonSaveAs = wrapper.find(SELECTOR_BUTTON_SAVE_AS);
      const buttonSaved = wrapper.find(SELECTOR_BUTTON_SAVED);
      const buttonUpdate = wrapper.find(SELECTOR_BUTTON_UPDATE);
      const buttonDelete = wrapper.find(SELECTOR_BUTTON_DELETE);

      expect(buttonSaveAs.exists()).toBe(true);
      expect(buttonSaved.exists()).toBe(false);
      expect(buttonUpdate.exists()).toBe(true);
      expect(buttonDelete.exists()).toBe(true);
    });

    describe('updates the saved query', () => {
      beforeEach(() => {
        mockUtils = jest
          .spyOn(utils, 'handleUpdateQuery')
          .mockImplementation(() => Promise.resolve(errorsSavedQuery));
        onQueryChange = jest.fn();
      });

      afterEach(() => {
        mockUtils.mockClear();
      });

      it('accepts a well-formed query', async () => {
        const wrapper = generateWrappedComponent(
          location,
          organization,
          errorsViewModified,
          savedQueries,
          onQueryChange
        );

        // Click on Save in the Dropdown
        const buttonUpdate = wrapper.find(SELECTOR_BUTTON_UPDATE).first();
        await buttonUpdate.simulate('click');

        expect(mockUtils).toHaveBeenCalledWith(
          expect.anything(), // api
          organization,
          expect.objectContaining({
            ...errorsViewModified,
          })
        );
        expect(onQueryChange).toHaveBeenCalled();
      });
    });

    describe('creates a separate query', () => {
      beforeEach(() => {
        mockUtils = jest
          .spyOn(utils, 'handleCreateQuery')
          .mockImplementation(() => Promise.resolve(errorsSavedQuery));
      });

      afterEach(() => {
        mockUtils.mockClear();
      });

      it('checks that it is forked from a saved query', async () => {
        const wrapper = generateWrappedComponent(
          location,
          organization,
          errorsViewModified,
          savedQueries,
          onQueryChange
        );

        // Click on ButtonSaveAs to open dropdown
        const buttonSaveAs = wrapper.find('DropdownControl').first();
        buttonSaveAs.simulate('click');

        // Fill in the Input
        buttonSaveAs
          .find('ButtonSaveInput')
          .simulate('change', {target: {value: 'Forked Query'}});
        await tick();

        // Click on Save in the Dropdown
        await buttonSaveAs.find('ButtonSaveDropDown Button').simulate('click');

        expect(mockUtils).toHaveBeenCalledWith(
          expect.anything(), // api
          organization,
          expect.objectContaining({
            ...errorsViewModified,
            name: 'Forked Query',
          }),
          false
        );
        expect(onQueryChange).toHaveBeenCalled();
      });
    });
  });
});
