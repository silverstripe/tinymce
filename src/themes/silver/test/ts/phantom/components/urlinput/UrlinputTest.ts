import { Assertions, Keyboard, Keys, Logger, Mouse, Step, UiFinder, Waiter, ApproxStructure, Chain } from '@ephox/agar';
import { Behaviour, Focusing, GuiFactory, Memento, Positioning, Representing } from '@ephox/alloy';
import { UnitTest } from '@ephox/bedrock';
import { Future, Option, Result } from '@ephox/katamari';
import { SelectorFind, Value } from '@ephox/sugar';

import { LinkTargetType } from '../../../../../main/ts/ui/core/LinkTargets';
import { renderUrlInput } from '../../../../../main/ts/ui/dialog/UrlInput';
import { GuiSetup } from '../../../module/AlloyTestUtils';
import { UrlData } from '../../../../../main/ts/backstage/UrlInputBackstage';
import I18n from 'tinymce/core/api/util/I18n';

UnitTest.asynctest('UrlInput component Test', (success, failure) => {
  GuiSetup.setup(
    (store, doc, body) => {
      const memSink = Memento.record(
        {
          dom: {
            tag: 'div'
          },
          behaviours: Behaviour.derive([
            Positioning.config({ })
          ])
        }
      );

      const self = GuiFactory.build(
        {
          dom: {
            tag: 'div'
          },
          components: [
            memSink.asSpec(),
            renderUrlInput({
              type: 'urlinput',
              label: Option.some('UrlInput label'),
              colspan: Option.none(),
              name: 'col1',
              filetype: 'file'
            }, {
              getSink: () => {
                return memSink.getOpt(self).fold(
                  () => Result.error('No sink'),
                  Result.value
                );
              },
              translate: I18n.translate,
              providers: {
                icons: () => <Record<string, string>> {}
              }
            }, {
              getHistory: (fileType) => [],
              addToHistory: (url, filetype) => store.adder('addToHistory')(),
              getLinkInformation: () => Option.some({
                targets: [
                  {
                    type: 'header' as LinkTargetType,
                    title: 'Header1',
                    url: '#header',
                    level: 0,
                    attach: store.adder('header1.attach')
                  }
                ],
                anchorTop: Option.some('#anchor-top'),
                anchorBottom: Option.none()
              }),
              getValidationHandler: () => Option.none(),
              getUrlPicker: (filetype) => Option.some((entry: UrlData) => {
                store.adder('urlpicker')();
                return Future.pure({ value: 'http://tiny.cloud', meta: { before: entry.value } });
              })
            })
          ]
        }
      );

      return self;
    },
    (doc, body, gui, component, store) => {

      const input = component.getSystem().getByDom(
        SelectorFind.descendant(component.element(), 'input').getOrDie(
          'Could not find input'
        )
      ).getOrDie();

      return [
        GuiSetup.mAddStyles(doc, [
          '.tox-menu { background: white; }',
          '.tox-collection__item--active { background: #cadbee }'
        ]),

        Step.sync(() => {
          Focusing.focus(input);
        }),
        Keyboard.sKeydown(doc, Keys.down(), { }),

        Waiter.sTryUntil(
          'Waiting for menu to appear',
          UiFinder.sExists(
            component.element(),
            '.tox-menu .tox-collection__item'
          ),
          100,
          4000
        ),

        Chain.asStep(component.element(), [
          UiFinder.cFindIn('[role="menu"]'),
          Assertions.cAssertStructure(
            'Checking structure of menu (especially text)',
            ApproxStructure.build((s, str, arr) => {
              return s.element('div', {
                classes: [ arr.has('tox-menu'), arr.has('tox-collection--list'), arr.has('tox-collection') ],
                children: [
                  s.element('div', {
                    classes: [ arr.has('tox-collection__group') ],
                    children: [
                      s.element('div', {
                        classes: [ arr.has('tox-collection__item')],
                        children: [
                          s.element('span', { classes: [ arr.has('tox-collection__item-icon') ]}),
                          s.element('span', { html: str.is('Header1') })
                        ]
                      })
                    ]
                  }),
                  s.element('div', {
                    classes: [ arr.has('tox-collection__group') ],
                    children: [
                      s.element('div', {
                        children: [
                          s.element('span', { classes: [ arr.has('tox-collection__item-icon') ]}),
                          s.element('span', { html: str.is('&lt;top&gt;') })
                        ]
                      })
                    ]
                  })
                ]
              });
            })
          )
        ]),

        store.sAssertEq('nothing in store ... before selecting item', []),
        Keyboard.sKeydown(doc, Keys.enter(), { }),
        Step.sync(() => {
          Assertions.assertEq('Checking Value.get', '#header', Value.get(input.element()));
          const repValue = Representing.getValue(input);
          Assertions.assertEq('Checking Rep.getValue',
            {
              value: '#header',
              meta: { text: 'Header1' }
            },
            {
              value: repValue.value,
              meta: { text: repValue.meta.text }
            }
          );
        }),

        store.sAssertEq('addToHistory called ... before firing attach', [ 'addToHistory' ]),
        Logger.t(
          'Check that attach fires',
          Step.sync(() => {
            const repValue = Representing.getValue(input);
            repValue.meta.attach();
          })
        ),
        store.sAssertEq('Attach should be in store ... after firing attach', [ 'addToHistory' , 'header1.attach' ]),

        Mouse.sClickOn(component.element(), 'button'),

        store.sAssertEq(
          'URL picker should have been opened ... after clicking button',
          [ 'addToHistory' , 'header1.attach', 'urlpicker' ]
        ),

        Waiter.sTryUntilPredicate('Checking Value.get', () => {
          return 'http://tiny.cloud' === Value.get(input.element());
        }, 100, 4000),

        Step.sync(() => {
          const repValue = Representing.getValue(input);
          Assertions.assertEq('Checking Rep.getValue', {
            value: 'http://tiny.cloud',
            meta: { before: '#header'}
          }, repValue);
        }),

        GuiSetup.mRemoveStyles
      ];
    },
    success,
    failure
  );
});