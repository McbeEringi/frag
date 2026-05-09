#!/usr/bin/env -S bun --install=force

import{dirname,join}from'node:path';
import{fromAsyncCodeToHtml}from'@shikijs/markdown-it/async';
import MarkdownItAsync from'markdown-it-async';
import{codeToHtml}from'shiki';


const
dir={
	src:'src/frag',
	dst:'dst/frag'
},
root=(...x)=>join(dirname(Bun.argv[1]),...x),
heading=(n=1,m=n,{
	_s='[ \t]',
	_h='(?<heading>.+)',
	_i=' {0,3}'
}={})=>new RegExp([
	`^${_i}(?<mark>#{${n},${m}})${_s}+${_h}$`,
	...[...Array(m-n+1)].flatMap((x,i)=>(x='=-'[i+n-1])?[`^${_i}${_h}\r?\n${_i}(?<mark_alt>${x})+${_s}*$`]:[])
].join('|'),'mg'),
tmpl=await Bun.file(root('frag.tmpl.html')).text(),
frag=await Promise.all(
	(await Bun.$`rm -rf ${root(dir.dst)}`,new Bun.Glob('**/*.md')).scanSync({cwd:root(dir.src)})[Symbol.iterator]().map(async w=>(
		w={
			path:w,
			...(
				await Bun.file(root(dir.src,w)).text()
			).match(/^(?<shebang>#![^\n]*)?(?:\r?\n)*(?:---\r?\n(?<front_matter>.*?)\r?\n---)?(?:\r?\n)+(?<markdown>.*)$/s)?.groups||{}
		},
		w.front_matter&&=Bun.YAML.parse(w.front_matter),
		(r=>((
			w.title=r.exec(w.markdown)?.groups.heading
		)&&(
			w.opening=(l=32)=>w.markdown.slice(r.lastIndex).replace(heading(1,6),'<$<heading>>:').replace(/(?:\r?\n)+/g,' ').slice(0,l-2).trim()+'……'
		)))(heading(1)),

		w.html=new HTMLRewriter()
			.on('div.md',{element:async(e,md)=>(
				md=MarkdownItAsync(),
				md.use(fromAsyncCodeToHtml(codeToHtml,{
					themes:{
						light:'one-light',
						dark:'one-dark-pro',
					},
					defaultColor:false,
				})),
				e.append(
					await md.renderAsync(w.markdown),
					{html:1}
				)
			)})
			.on('title',{element:e=>e.append(w.title)})
			.on('meta[name="description"]',{element:e=>e.setAttribute('content',w.front_matter?.desc??w.opening?.()??'あのイーハトーヴォのすきとおった風……')})
			.on('meta[style]',{element:e=>e.replace(
				[
					'https://mcbeeringi.dev/src/shiki.css',
					'https://mcbeeringi.dev/src/style.css'
				].map(x=>`<link rel="stylesheet" href="${x}">`).join(''),
				{html:1}
			)})
			.transform(tmpl),
		Bun.write(root(dir.dst,w.path.replace(/\.md$/,'.html')),w.html),
		w
	))
);

await Bun.write(
	root(dir.dst,'index.html'),
	new HTMLRewriter()
		.on('div.index',{element:e=>e.append(
			`<ul>${frag.map(w=>`<li><a href="${w.path.replace(/\.md$/,'.html')}">${w.title}</a></li>`).join('')}</ul>`,
			{html:1}
		)})
		.transform(await Bun.file(root('index.tmpl.html')).text())
);
