---
mk: 2026-05-14
mod: 2026-05-14
tag:
    - protobuf
    - binary
    - apple
    - pencilkit
---

# Apple PencilKit - PKDrawing のバイナリ

メモ帳とかフリーボードとかにApplePencilで描くあれ。
SVGに変換したくてClaudeに投げたら解析してくれた。

ヘッダー8Bの後はProtoBufferの模様。

ヘッダー8Bはマジックナンバー4Bとバージョン4B。
マジックナンバーは `wrd\xf0`==`77 72 64 f0`

protobufで解凍できるところをひたすら解凍する感じ。

一番上のfield4がツールについて、field5がストローク

ツールは色と名前が入っている。
ストロークはツールのインデックス番号とかの情報に並んで点群が入っている。
だいたいFloat32なのでこれを読んでいく。

とにかく下のコードを読んでなんとか理解してほしい。
丸投げ。


```js
#!/usr/bin/env -S bun --install=force
import{depb}from'@mcbeeringi/petit/protobuf';


const
td=new TextDecoder(),
uuid=x=>x.toHex(),//x.reduce((a,x)=>a+x.toString(16).padStart(2,0),''),
va=x=>depb(x).reduce((a,x)=>(x.type==0&&(a[x.i-1]=+x.value),a),[]),
fa=x=>depb(x).reduce((a,x)=>(x.type==5&&(a[x.i-1]=new Float32Array(x.value.buffer)[0]),a),[]),
parse=w=>w.slice(0,4).toHex()=='777264f0'&&depb(w.slice(8)).reduce((a,x)=>(
	x.i={
		2:'uuid',
		3:'order',
		4:'tool',
		5:'stroke',
		6:'view',
		7:'meta'
	}[x.i]??x.i,
	a[x.i]??=[],
	a[x.i].push(({
		uuid,
		order:va,
		tool:x=>depb(x).reduce((a,x)=>(
			x.i={
				1:'col',2:'name',3:'ver'
			}[x.i]??x.i,
			a[x.i]=({
				col:x=>fa(x).reduce((a,x,i)=>a+(i==3&&+x==1?'':Math.round(x*255).toString(16).padStart(2,0)),'#'),
				name:x=>td.decode(x).split('.').reverse(),
			}[x.i]??(_=>_))(x.value),
			a
		),{}),
		stroke:x=>depb(x).reduce((a,x)=>(
			x.i={
				2:'ctx',
				3:'layer_info',
				4:'tool',
				5:'path',
				6:'bound'
			}[x.i]??x.i,
			a[x.i]=({
				field2:va,
				field3:va,
				path:x=>depb(x).reduce((a,x)=>(
					x.i={
						1:'uuid',
						2:'time',
						3:'num',
						6:'scale',
						7:'point'
					}[x.i]??x.i,
					a[x.i]=({
						uuid,
						// time:x=>new BigUint64Array(x.buffer)[0]
						// scale:x=>({
						// 	scale:new Float32Array(x.buffer,0,1)[0],
						// 	grid:new Uint32Array(x.buffer,4,1)[0],
						// 	flag:x.subarray(8)
						// }),
						point:(w,n=w.length/a.num)=>[...Array(+a.num)].map((x,i)=>(
							x=w.slice(i++*n,i*n),
							new Float32Array(x.buffer,0,3).reduce(
								(a,x,i)=>(a[['x','y','pressure'][i]??i]=x,a),
								{unknown:x.subarray(12)}
							)
						))
					}[x.i]??(_=>_))(x.value),
					a
				),{}),
				bound:fa
			}[x.i]??(_=>_))(x.value),
			a
		),{}),
		view:fa,
		meta:va
	}[x.i]??(_=>_))(x.value)),
	a
),{version:w.slice(4,8)}),

p2a=x=>x.map(x=>[x.x,x.y]),
psub=(a,b)=>a.map((x,i)=>b[i]-x),
pfmt=x=>x.map(x=>x.toFixed(2)),
mp=(a,b)=>a.map((x,i)=>(x+b[i])/2),
pk2svg=w=>(w=parse(w))&&`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${
	console.log(w.view),
	(x=>[x.bx,x.by,x.tx-x.bx,x.ty-x.by])(w.stroke.reduce((a,{bound:x})=>({
		bx:Math.min(a.bx?? 1/0,x[0]),
		by:Math.min(a.by?? 1/0,x[1]),
		tx:Math.max(a.tx??-1/0,x[0]+x[2]),
		ty:Math.max(a.ty??-1/0,x[1]+x[3])
	}),{}))
}" fill="none" stroke-linejoin="round" stroke-linecap="round">\n${
	w.stroke.map(x=>`<path d="${
		// x.path.point.map((x,i)=>(x=[x.x,x.y].map(x=>x.toFixed(2)),i?`L${x}`:`M${x}`)).join('')
		[
			(x=>`M${pfmt(x[0])}l${pfmt(psub(x[0],mp(x[0],x[1])))}`)(p2a(x.path.point.slice(0,2))),
			...[...Array(x.path.point.length-2)].map((y,i,a)=>(y=p2a(x.path.point.slice(i,i+3)),y[0]=mp(y[0],y[1]),`${i?',':'q'}${pfmt(psub(y[0],y[1]))},${pfmt(psub(y[0],mp(y[1],y[2])))}`)),
			(x=>`l${pfmt(psub(mp(x[0],x[1]),x[1]))}`)(p2a(x.path.point.slice(-2)))
		].join('').replace(/,([-0])0?/g,'$1')
	}" stroke="${w.tool[x.tool].col}"${w.tool[x.tool].name[0]=='marker'?' opacity=".5" stroke-width="5"':''}/>\n`).join('')
}</svg>`;


await Bun.write(
	`${Bun.argv[2].split('/').pop()}.svg`,
	pk2svg(await Bun.file(Bun.argv[2]).bytes())
);

```
