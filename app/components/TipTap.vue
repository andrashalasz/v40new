v<template>
    <div>
        <section v-if="editor"
            class="buttons text-gray-700 dark:text-white flex items-center flex-wrap gap-x-4 border-t border-l border-r border-gray-400 p-4">
            <button type="button" @click="editor.chain().focus().toggleBold().run()"
                :class="{ 'bg-gray-200 rounded dark:bg-[#3f3f3f]': editor.isActive('bold') }" class="p-1">
                <BoldIcon title="Bold" />
            </button>
            <button type="button" @click="editor.chain().focus().toggleItalic().run()"
                :class="{ 'bg-gray-200 rounded dark:bg-[#3f3f3f]': editor.isActive('italic') }" class="p-1">
                <ItalicIcon title="Italic" />
            </button>
            <button type="button" @click="editor.chain().focus().toggleUnderline().run()"
                :class="{ 'bg-gray-200 rounded dark:bg-[#3f3f3f]': editor.isActive('underline') }" class="p-1">
                <UnderlineIcon title="Underline" />
            </button>
            <button type="button" @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{
                'bg-gray-200 rounded dark:bg-[#3f3f3f]': editor.isActive('heading', { level: 1 }),
            }" class="p-1">
                <H1Icon title="H1" />
            </button>
            <button type="button" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{
                'bg-gray-200 rounded dark:bg-[#3f3f3f]': editor.isActive('heading', { level: 2 }),
            }" class="p-1">
                <H2Icon title="H2" />
            </button>
            <button type="button" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()" :class="{
                'bg-gray-200 rounded dark:bg-[#3f3f3f]': editor.isActive('heading', { level: 3 }),
            }" class="p-1">
                <H3Icon title="H3" />
            </button>
            <button type="button" @click="editor.chain().focus().toggleBulletList().run()"
                :class="{ 'bg-gray-200 rounded dark:bg-[#3f3f3f]': editor.isActive('bulletList') }" class="p-1">
                <ListIcon title="Bullet List" />
            </button>
            <button type="button" @click="editor.chain().focus().toggleOrderedList().run()"
                :class="{ 'bg-gray-200 rounded dark:bg-[#3f3f3f]': editor.isActive('orderedList') }" class="p-1">
                <OrderedListIcon title="Ordered List" />
            </button>
            <button type="button" @click="editor.chain().focus().toggleBlockquote().run()"
                :class="{ 'bg-gray-200 rounded dark:bg-[#3f3f3f]': editor.isActive('blockquote') }" class="p-1">
                <BlockquoteIcon title="Blockquote" />
            </button>
            <button type="button" @click="editor.chain().focus().toggleCode().run()"
                :class="{ 'bg-gray-200 rounded dark:bg-[#3f3f3f]': editor.isActive('code') }" class="p-1">
                <CodeIcon title="Code" />
            </button>
            <button type="button" @click="editor.chain().focus().setHorizontalRule().run()" class="p-1">
                <HorizontalRuleIcon title="Horizontal Rule" />
            </button>
            <button type="button" class="p-1 disabled:text-gray-400" @click="editor.chain().focus().undo().run()"
                :disabled="!editor.can().chain().focus().undo().run()">
                <UndoIcon title="Undo" />
            </button>
            <button type="button" @click="editor.chain().focus().redo().run()"
                :disabled="!editor.can().chain().focus().redo().run()" class="p-1 disabled:text-gray-400">
                <RedoIcon title="Redo" />
            </button>
            <button type="button" class="p-1" @click="addImage">
                📷
            </button>
            <button type="button" class="p-1" @click="toggleLink"
                :class="{ 'bg-gray-200 rounded dark:bg-[#3f3f3f]': editor.isActive('link') }">
                🔗
            </button>
        </section>
        <EditorContent :editor="editor" />
    </div>
</template>

<script setup>
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import ListItem from '@tiptap/extension-list-item'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import Link from '@tiptap/extension-link'
import BoldIcon from 'vue-material-design-icons/FormatBold.vue'
import ItalicIcon from 'vue-material-design-icons/FormatItalic.vue'
import UnderlineIcon from 'vue-material-design-icons/FormatUnderline.vue'
import H1Icon from 'vue-material-design-icons/FormatHeader1.vue'
import H2Icon from 'vue-material-design-icons/FormatHeader2.vue'
import H3Icon from 'vue-material-design-icons/FormatHeader3.vue'
import ListIcon from 'vue-material-design-icons/FormatListBulleted.vue'
import OrderedListIcon from 'vue-material-design-icons/FormatListNumbered.vue'
import BlockquoteIcon from 'vue-material-design-icons/FormatQuoteClose.vue'
import CodeIcon from 'vue-material-design-icons/CodeTags.vue'
import HorizontalRuleIcon from 'vue-material-design-icons/Minus.vue'
import UndoIcon from 'vue-material-design-icons/Undo.vue'
import RedoIcon from 'vue-material-design-icons/Redo.vue'

const props = defineProps({
    modelValue: String,
})

const emit = defineEmits(['update:modelValue'])

const LinkExtension = Link.extend({
    autoLink: false,
})

const editor = useEditor({
    content: props.modelValue,
    onUpdate: ({ editor }) => {
        const htmlContent = editor.getHTML();
        emit('update:modelValue', htmlContent);
    },
    extensions: [
        StarterKit,
        Underline,
        Image,
        BulletList,
        OrderedList,
        ListItem,
        LinkExtension
    ],
    editorProps: {
        attributes: {
            class: 'border border-gray-400 p-4 min-h-[12rem] max-h-[12rem] prose overflow-y-auto outline-none max-w-none',
        },
    },
})
// Kép beszúrása URL alapján
const addImage = () => {
    const url = window.prompt('Kép URL címe:')
    if (url) {
        editor.value.chain().focus().setImage({ src: url }).run()
    }
}

const setLink = () => {
    const previousUrl = editor.value.getAttributes('link').href
    const url = window.prompt('Link URL:', previousUrl)

    if (url === null) return

    if (url === '') {
        editor.value
            .chain()
            .focus()
            .unsetLink()
            .run()
        return
    }

    editor.value
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({
            href: url,
            target: '_blank',
            rel: 'noopener noreferrer',
        })
        .run()
}

const toggleLink = () => {
    if (!editor.value) return

    // Ha a kurzor alatt már link van, akkor töröljük
    if (editor.value.isActive('link')) {
        editor.value.chain().focus().unsetLink().run()
        return
    }

    // Egyébként kérjük az URL-t
    const previousUrl = editor.value.getAttributes('link').href
    const url = window.prompt('Link URL:', previousUrl)

    if (!url) return

    editor.value.chain()
        .focus()
        .extendMarkRange('link')
        .setLink({
            href: url,
            target: '_blank',
            rel: 'noopener noreferrer',
        })
        .run()
}
</script>

<style>
/* Basic editor styles */
.tiptap {
    :first-child {
        margin-top: 0;
    }

    /* List styles */
    ul,
    ol {
        padding: 0 1rem;
        margin: 1.25rem 1rem 1.25rem 0.4rem;

        li p {
            margin-top: 0.25em;
            margin-bottom: 0.25em;
        }
    }

    /* Heading styles */
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
        line-height: 1.1;
        margin-top: 2.5rem;
        text-wrap: pretty;
    }

    h1,
    h2 {
        margin-top: 3.5rem;
        margin-bottom: 1.5rem;
    }

    h1 {
        font-size: 1.4rem;
    }

    h2 {
        font-size: 1.2rem;
    }

    h3 {
        font-size: 1.1rem;
    }

    h4,
    h5,
    h6 {
        font-size: 1rem;
    }

    /* Code and preformatted text styles */
    code {
        background-color: var(--purple-light);
        border-radius: 0.4rem;
        color: var(--black);
        font-size: 0.85rem;
        padding: 0.25em 0.3em;
    }

    pre {
        background: var(--black);
        border-radius: 0.5rem;
        color: var(--white);
        font-family: 'JetBrainsMono', monospace;
        margin: 1.5rem 0;
        padding: 0.75rem 1rem;

        code {
            background: none;
            color: inherit;
            font-size: 0.8rem;
            padding: 0;
        }
    }

    blockquote {
        border-left: 3px solid var(--gray-3);
        margin: 1.5rem 0;
        padding-left: 1rem;
    }

    hr {
        border: none;
        border-top: 1px solid var(--gray-2);
        margin: 2rem 0;
    }

    a {
        color: #2563eb;
        /* nice blue */
        text-decoration: underline;
    }
}
</style>