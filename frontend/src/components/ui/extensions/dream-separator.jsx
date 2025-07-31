import { Node, mergeAttributes } from '@tiptap/core';

export const DreamSeparator = Node.create({
    name: 'dreamSeparator',

    group: 'block',

    atom: true,

    draggable: true,

    parseHTML() {
        return [
            {
                tag: 'div[data-type="dream-separator"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'dream-separator',
                class: 'dream-separator-node',
            }),
            [
                'div',
                { class: 'dream-separator-content' },
                [
                    'div',
                    { class: 'dream-separator-line' },
                ],
                [
                    'div',
                    { class: 'dream-separator-icon' },
                    '✧', // 使用星形符号表示梦境的神秘感
                ],
                [
                    'div',
                    { class: 'dream-separator-line' },
                ],
            ],
        ];
    },

    addCommands() {
        return {
            insertDreamSeparator:
                () =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: this.name,
                        });
                    },
        };
    },

    addKeyboardShortcuts() {
        return {
            'Mod-Shift-Enter': () => this.editor.commands.insertDreamSeparator(),
        };
    },
}); 