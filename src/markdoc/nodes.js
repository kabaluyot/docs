import { nodes as defaultNodes } from '@markdoc/markdoc'
import { slugifyWithCounter } from '@sindresorhus/slugify'
import yaml from 'js-yaml'
import { Tag } from '@markdoc/markdoc'
import { Link } from 'next/link'
import MarkdownLayout from '@/components/MarkdownLayout'
import Fence from '@/components/Fence'
import {
  nodeBottomNav,
  dcsBottomNav,
  learnBottomNav,
  supportBottomNav,
} from '@/markdoc/navigation.mjs'
import probe from 'probe-image-size'
import crypto from 'crypto'
import imageSizeCache from '../../.image-size-cache.json'

const ImageWrap = ({ src, alt, width, height }) => {
  let imgStyle = 'xs:max-w-full sm:max-w-sm'
  let newWidth = width
  let newHeight = height
  if (width > height) {
    imgStyle = 'max-w-full h-auto'
  }
  if (height > 384) {
    newHeight = 384
    newWidth = (width * newHeight) / height
  }

  return (
    <a target="_blank" rel="noreferrer" href={src}>
      <img
        className={`object-fit ${imgStyle}`}
        width={newWidth}
        height={newHeight}
        src={src}
        alt={alt}
      />
    </a>
  )
}

let documentSlugifyMap = new Map()

const nodes = {
  document: {
    ...defaultNodes.document,
    render: MarkdownLayout,
    async transform(node, config) {
      documentSlugifyMap.set(config, slugifyWithCounter())

      return new Tag(
        this.render,
        { frontmatter: yaml.load(node.attributes.frontmatter), ast: node },
        await node.transformChildren(config)
      )
    },
  },
  heading: {
    ...defaultNodes.heading,
    transform(node, config) {
      let slugify = documentSlugifyMap.get(config)
      let attributes = node.transformAttributes(config)
      let children = node.transformChildren(config)
      let text = children.filter((child) => typeof child === 'string').join(' ')
      let id = attributes.id ?? slugify(text)

      return new Tag(
        `h${node.attributes.level}`,
        { ...attributes, id },
        children
      )
    },
  },
  link: {
    render: Link,
    attributes: {
      ...defaultNodes.link.attributes,
    },
    children: defaultNodes.children,
    transform(node, config) {
      const attributes = node.transformAttributes(config)
      const children = node.transformChildren(config)
      if (attributes.href?.startsWith('docId')) {
        let parts = attributes.href.split(':')
        let [docId, fragment] = parts[1].split('#')
        let entry = nodeBottomNav.find((o) => o.docId === docId)
        if (!entry) {
          entry = dcsBottomNav.find((o) => o.docId === docId)
        }
        if (!entry) {
          entry = supportBottomNav.find((o) => o.docId === docId)
        }
        if (!entry) {
          entry = learnBottomNav.find((o) => o.docId === docId)
        }

        let tag = new Tag(
          'a',
          entry?.href
            ? { href: `${entry.href}${fragment ? `#${fragment}` : ''}` }
            : attributes,
          children.length === 0 && entry?.title ? [entry.title] : children
        )
        return tag
      }
      return new Tag('a', attributes, children)
    },
  },
  image: {
    render: ImageWrap,
    attributes: {
      ...defaultNodes.image.attributes,
    },
    children: defaultNodes.children,
    async transform(node, config) {
      const attributes = node.transformAttributes(config)
      const children = node.transformChildren(config)
      if (!attributes.src.includes('http')) {
        return new Tag('img', attributes, children)
      }
      const hash = crypto.createHash('md5').update(attributes.src).digest('hex')
      let result = imageSizeCache[hash]
      if (!result) {
        result = await probe(attributes.src)
      }

      return new Tag(
        this.render,
        { ...attributes, width: result.width, height: result.height },
        children
      )
    },
  },
  table: {
    render: ({ children }) => {
      return (
        <div className="overflow-x-auto">
          <table>{children}</table>
        </div>
      )
    },
  },
  th: {
    ...defaultNodes.th,
    attributes: {
      ...defaultNodes.th.attributes,
      scope: {
        type: String,
        default: 'col',
      },
    },
  },
  fence: {
    render: Fence,
    attributes: {
      language: {
        type: String,
      },
    },
  },
}

export default nodes
