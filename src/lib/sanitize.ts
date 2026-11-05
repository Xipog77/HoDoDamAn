import sanitizeHtml from 'sanitize-html'

// Rich text from TipTap and posts imported from Blogger. Anything that can run script
// (script tags, on* handlers, javascript: URLs) is stripped before the HTML is stored,
// since it is rendered later with dangerouslySetInnerHTML.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'img', 'figure', 'figcaption', 'span', 'u', 's', 'del', 'ins', 'sub', 'sup', 'iframe',
  ],
  allowedAttributes: {
    '*': ['style', 'class', 'title', 'align'],
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowedIframeHostnames: [
    'www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com',
    'www.google.com', 'drive.google.com', 'www.facebook.com',
  ],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.target === '_blank' ? { ...attribs, rel: 'noopener noreferrer' } : attribs,
    }),
  },
}

export function sanitizeRichText(html: string | null | undefined): string | null | undefined {
  if (html == null) return html
  return sanitizeHtml(html, OPTIONS)
}

const PERSON_HTML_FIELDS = ['fullBiography', 'achievements'] as const

/** Sanitize the rich-text columns of a persons insert/update payload in place. */
export function sanitizePersonHtml<T extends Record<string, any>>(data: T): T {
  for (const field of PERSON_HTML_FIELDS) {
    if (typeof data[field] === 'string') (data as any)[field] = sanitizeRichText(data[field])
  }
  return data
}
