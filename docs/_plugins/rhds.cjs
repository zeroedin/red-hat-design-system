// @ts-check
const fs = require('node:fs');
const yaml = require('js-yaml');
const path = require('node:path');
const _slugify = require('slugify');
const slugify = typeof _slugify === 'function' ? _slugify : _slugify.default;
const capitalize = require('capitalize');
const exec = require('node:util').promisify(require('node:child_process').exec);
const cheerio = require('cheerio');
const RHDSAlphabetizeTagsPlugin = require('./alphabetize-tags.cjs');
const RHDSShortcodesPlugin = require('./shortcodes.cjs');
const { parse } = require('async-csv');

/** @typedef {object} EleventyTransformContext */

/**
 * Replace paths in demo files from the dev SPA's format to 11ty's format
 * @this {EleventyTransformContext}
 * @param {string} content
 */
function demoPaths(content) {
  const { outputPath, inputPath } = this;
  const isNested = outputPath.match(/demo\/.+\/index\.html$/);
  if (inputPath === './docs/elements/demos.html' ) {
    const $ = cheerio.load(content);
    $('[href], [src]').each(function() {
      const el = $(this);
      const attr = el.attr('href') ? 'href' : 'src';
      const val = el.attr(attr);
      if (!val) {
        return;
      }
      if (!val.startsWith('http') && !val.startsWith('/') && !val.startsWith('#')) {
        el.attr(attr, `${isNested ? '../' : ''}${val}`);
      } else if (val.startsWith('/elements/rh-')) {
        el.attr(attr, val.replace('/elements/rh-', '/'));
      }
    });
    return $.html();
  }
  return content;
}

// Rewrite DEMO lightdom css relative URLs
const LIGHTDOM_HREF_RE = /href="\.(?<pathname>.*-lightdom\.css)"/g;
const LIGHTDOM_PATH_RE = /href="\.(.*)"/;

/**
 * @param {string | number | Date} dateStr
 */
function prettyDate(dateStr, options = {}) {
  const { dateStyle = 'medium' } = options;
  return new Intl.DateTimeFormat('en-US', { dateStyle })
      .format(new Date(dateStr));
}

function getTagNameSlug(tagName, config) {
  const name = config?.aliases?.[tagName] ?? tagName.replace(`${config?.tagPrefix ?? 'rh'}-`, '');
  return slugify(name, {
    strict: true,
    lower: true,
  });
}

/** Files with these extensions will copy from /elements/foo/docs/ to _site/elements/foo */
const COPY_CONTENT_EXTENSIONS = [
  'svg',
  'png',
  'jpg',
  'jpeg',
  'bmp',
  'webp',
  'webm',
  'mp3',
  'ogg',
  'json',
  'css',
  'js',
  'map',
  'd.ts',
];

/**
 * Generate a map of files per package which should be copied to the site dir
 */
function getFilesToCopy() {
  // Copy element demo files
  const repoRoot = process.cwd();
  const tagNames = fs.readdirSync(path.join(repoRoot, 'elements'));

  /** @type{import('@patternfly/pfe-tools/config.js').PfeConfig}*/
  const config = require('../../.pfe.config.json');

  // Copy all component and core files to _site
  return Object.fromEntries(tagNames.flatMap(tagName => {
    const slug = getTagNameSlug(tagName, config);
    return Object.entries({
      [`elements/${tagName}/demo/`]: `elements/${slug}/demo`,
      [`elements/${tagName}/docs/**/*.{${COPY_CONTENT_EXTENSIONS.join(',')}}`]: `elements/${slug}`,
    });
  }));
}

function alphabeticallyBySlug(a, b) {
  return (
      a.slug < b.slug ? -1
    : a.slug > b.slug ? 1
    : 0
  );
}

/** @param {import('@11ty/eleventy/src/UserConfig')} eleventyConfig */
module.exports = function(eleventyConfig, { tagsToAlphabetize }) {
  eleventyConfig.addDataExtension('yml, yaml', contents => yaml.load(contents));

  eleventyConfig.addDataExtension('csv', contents => parse(contents));

  eleventyConfig.addPlugin(RHDSAlphabetizeTagsPlugin, { tagsToAlphabetize });

  /** add `section`, `example`, `demo`, etc. shortcodes */
  eleventyConfig.addPlugin(RHDSShortcodesPlugin);

  eleventyConfig.addPassthroughCopy('docs/demo.{js,map,ts}');

  eleventyConfig.addPassthroughCopy({
    'node_modules/element-internals-polyfill': '/assets/packages/element-internals-polyfill',
  });

  // ensure icons are copied to the assets dir.
  eleventyConfig.addPassthroughCopy({
    'node_modules/@patternfly/icons/': '/assets/packages/@patternfly/icons/',
  });

  const filesToCopy = getFilesToCopy();
  eleventyConfig.addPassthroughCopy(filesToCopy, {
    filter: /** @param {string} path pathname */path => !path.endsWith('.html'),
  });

  eleventyConfig.addTransform('demo-subresources', demoPaths);

  eleventyConfig.addTransform('demo-lightdom-css', async function(content) {
    const { outputPath, inputPath } = this;
    const { pfeconfig } = eleventyConfig?.globalData ?? {};
    const { aliases } = pfeconfig;

    if (inputPath === './docs/elements/demos.html' ) {
      const tagNameMatch = outputPath.match(/\/elements\/(?<tagName>[-\w]+)\/demo\//);
      if (tagNameMatch) {
        const { tagName } = tagNameMatch.groups;

        // slugify the value of each key in aliases creating a new cloned copy
        const modifiedAliases = Object.fromEntries(Object.entries(aliases).map(([key, value]) => [
          slugify(key, { strict: true, lower: true }),
          value,
        ]));

        // does the tagName exist in the aliases object?
        const key = Object.keys(modifiedAliases).find(key => modifiedAliases[key] === tagName);

        const prefixedTagName = `${pfeconfig?.tagPrefix}-${tagName}`;
        const redirect = { new: key ?? prefixedTagName, old: tagName };
        const matches = content.match(LIGHTDOM_HREF_RE);
        if (matches) {
          for (const match of matches) {
            const [, path] = match.match(LIGHTDOM_PATH_RE) ?? [];
            const { pathname } = new URL(path, `file:///${outputPath}`);
            content = content.replace(`.${path}`, pathname
                .replace(`/_site/elements/${redirect.old}/`, `/assets/packages/@rhds/elements/elements/${redirect.new}/`)
                .replace('/demo/', '/'));
          }
        }
      }
    }
    return content;
  });

  eleventyConfig.addFilter('getTitleFromDocs', function(docs) {
    return docs.find(x => x.docsPage?.title)?.alias
      ?? docs[0]?.alias
      ?? docs[0]?.docsPage?.title
      ?? eleventyConfig.getFilter('deslugify')(docs[0]?.slug);
  });

  /** get the element overview from the manifest */
  eleventyConfig.addFilter('getElementDescription', function getElementDescription() {
    /**
     * NB: since the data for this shortcode is no a POJO,
     * but a DocsPage instance, 11ty assigns it to this.ctx._
     * @see https://github.com/11ty/eleventy/blob/bf7c0c0cce1b2cb01561f57fdd33db001df4cb7e/src/Plugins/RenderPlugin.js#L89-L93
     * @type {import('@patternfly/pfe-tools/11ty/DocsPage').DocsPage}
     */
    const docsPage = this.ctx._;
    return docsPage.description;
  });

  /** format date strings */
  eleventyConfig.addFilter('prettyDate', prettyDate);

  eleventyConfig.addFilter('deslugify', /** @param {string} slug */ function(slug) {
    return capitalize(slug.replace(/-/g, ' '));
  });

  eleventyConfig.addFilter('relatedItems', /** @param {string} item */ function(item) {
    const { relatedItems } = this.ctx;
    const { pfeconfig } = eleventyConfig?.globalData ?? {};
    const rels = relatedItems?.[item] ?? [];
    const unique = [...new Set(rels)];
    const related = unique.map(x => {
      const slug = getTagNameSlug(x, pfeconfig);
      const deslugify = eleventyConfig.getFilter('deslugify');
      return {
        name: x,
        url: slug === x ? `/patterns/${slug}` : `/elements/${slug}`,
        text: pfeconfig.aliases[x] || deslugify(slug),
      };
    }).sort((a, b) => a.text < b.text ? -1 : a.text > b.text ? 1 : 0);
    return related;
  });

  eleventyConfig.addFilter('makeSentenceCase', function(value) {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  });

  eleventyConfig.addCollection('sortedColor', async function(collectionApi) {
    const colorCollection = collectionApi.getFilteredByTags('color');
    return colorCollection.sort((a, b) => {
      if (a.data.order > b.data.order) {
        return 1;
      } else if (a.data.order < b.data.order) {
        return -1;
      } else {
        return 0;
      }
    });
  });

  eleventyConfig.addCollection('sortedDevelopers', async function(collectionApi) {
    const developersCollection = collectionApi.getFilteredByTags('developers');
    return developersCollection.sort((a, b) => {
      if (a.data.order > b.data.order) {
        return 1;
      } else if (a.data.order < b.data.order) {
        return -1;
      } else {
        return 0;
      }
    });
  });

  eleventyConfig.addCollection('elementDocs', async function(collectionApi) {
    const { pfeconfig } = eleventyConfig?.globalData ?? {};
    /**
     * @param {string} filePath
     */
    function getProps(filePath) {
      const [, tagName] = filePath.split(path.sep);
      const absPath = path.join(process.cwd(), filePath);
      /** configured alias for this element e.g. `Call to Action` for `rh-cta` */
      const alias = pfeconfig.aliases[tagName];
      /** e.g. `footer` for `rh-footer` or `call-to-action` for `rh-cta` */
      const slug = getTagNameSlug(tagName, pfeconfig);
      /** e.g. `Code` or `Guidelines` */
      const pageTitle =
        capitalize(filePath.split(path.sep).pop()?.split('.').shift()?.replace(/^\d+-/, '') ?? '');
      const pageSlug = slugify(pageTitle, { strict: true, lower: true });
      /** e.g. `/elements/call-to-action/code/index.html` */
      const overviewHref = `/elements/${slug}/`;
      const permalink =
          pageSlug === 'overview' ? `/elements/${slug}/index.html`
        : `/elements/${slug}/${pageSlug}/index.html`;
      const href = permalink.replace('index.html', '');
      const screenshotPath = `/elements/${slug}/screenshot.png`;
      /** urls for related links */
      return {
        tagName,
        filePath,
        absPath,
        alias,
        slug,
        pageTitle,
        pageSlug,
        screenshotPath,
        permalink,
        href,
        overviewHref,
      };
    }

    try {
      const { glob } = await import('glob');
      /** @type {(import('@patternfly/pfe-tools/11ty/DocsPage').DocsPage & { repoStatus?: any[] })[]} */
      const elements = await eleventyConfig.globalData?.elements();
      const filePaths = (await glob(`elements/*/docs/*.md`, { cwd: process.cwd() }))
          .filter(x => x.match(/\d{1,3}-[\w-]+\.md$/)); // only include new style docs
      const { repoStatus } = collectionApi.items.find(item => item.data?.repoStatus)?.data || [];
      return filePaths
          .map(filePath => {
            const props = getProps(filePath);
            const docsPage = elements.find(x => x.tagName === props.tagName);
            if (docsPage) {
              docsPage.repoStatus = repoStatus;
            }
            const tabs = filePaths
                .filter(x => x.split('/docs/').at(0) === (`elements/${props.tagName}`))
                .sort()
                .map(x => getProps(x));
            return { docsPage, tabs, ...props };
          })
          .sort(alphabeticallyBySlug);
    } catch (e) {
      // it's important to surface this
      // eslint-disable-next-line no-console
      console.error(e);
      throw e;
    }
  });

  for (const tagName of fs.readdirSync(path.join(process.cwd(), './elements/'))) {
    const dir = path.join(process.cwd(), './elements/', tagName, 'docs/');
    eleventyConfig.addWatchTarget(dir);
  }

  /** add the normalized pfe-tools config to global data */
  eleventyConfig.on('eleventy.before', async function() {
    const config = await import('@patternfly/pfe-tools/config.js').then(m => m.getPfeConfig());
    eleventyConfig.addGlobalData('pfeconfig', config);
  });

  /** custom-elements.json */
  eleventyConfig.on('eleventy.before', async function({ runMode }) {
    if (runMode === 'watch') {
      await exec('npx cem analyze');
    }
  });

  /** /assets/rhds.min.css */
  // eleventyConfig.on('eleventy.before', async function({ dir }) {
  //   const { readFile, writeFile } = fs.promises;
  //   const CleanCSS = await import('clean-css').then(x => x.default);
  //   const cleanCSS = new CleanCSS({ sourceMap: true, returnPromise: true });
  //   const outPath = path.join(dir.output, 'assets', 'rhds.min.css');
  //   /* Tokens */
  //   const sourcePath = path.join(process.cwd(), 'node_modules/@rhds/tokens/css/global.css');
  //   const source = await readFile(sourcePath, 'utf8');
  //   const { styles } = await cleanCSS.minify(source);
  //   // ensure '_site/assets' exists
  //   if (!fs.existsSync(dir.output)) {
  //     const assets = path.join(dir.output, 'assets');
  //     await fs.mkdirSync(assets, { recursive: true });
  //   }
  //   await writeFile(outPath, styles, 'utf8');
  // });
};
