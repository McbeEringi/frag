---
mk: 2016-05-14
mod: 2016-05-14
tag:
    - protobuf
    - binary
---

# ProtoBufferバイナリを読む

Googleがつくったデータ交換用フォーマットとそのエコシステムと実装のこと。
ふんわりしているけど多分Arduinoみたいなノリで捉えていいのかな。
JSONのkey-valueが別々のファイルになってvalue側はバイナリになったようなイメージ。
実際に通信経路でやりとりされるのはvalue側のバイナリだけでkey側は互いに共有されている前提。

遭遇した使用例

- Chrome Cast
- TOTP認証 6ケタ30秒のあれ
- Apple PencilKit PKDrawing

バイナリフォーマットは型が4種類ある。
wire typeっていうらしい。

- 0: VARIANT 可変長の整数
- 1: I64 8Byteのデータ
- 2: LEN バイナリ列なんでも
- 5: I32 4Byteのデータ

頭の数字が型に対応する番号で最初に出てくるデータのLSB3bitがこれ。
残りの5bitがkeyと対応づけるための番号。

VARIANTはMIDIのVLQみたいな可変長の整数を持てるやつ。
符号の有無はkey側で持つ。
負数は2の補数ではなくてzigzagエンコードというもの。
0→0, -1→1, 1→2, -2→3, 2→4 といった感じで小さな数でも効率が良い。

I64とI32はIとはついているものの、signed intかもしれないし、unsigned intかもしれないし、fixed pointかもしれないし、flaoting pointかもしれない。
keyありきのフォーマット。

LENは最初にVARIANTでデータ長が示されてデータが続く。
文字列とかはこれを使う。
もちろんここにProtoBufferを入れ子にできる。
入れ子にされているか否かはkeyを見るべし。
解析するときは、ひとまずデコードするといいかも。


簡単な実装をしてみた。
<https://github.com/mcbeeringi/petit/blob/protobuf.mjs>
