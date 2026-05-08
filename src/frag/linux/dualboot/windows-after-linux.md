---
mk: 2026-05-08
mod: 2026-05-08
tag:
    - linux
    - windows
    - efi
    - dualboot
---

# Linuxの後にWindowsをインストールする

普通に空き領域にWindowsを入れようとすると、LinuxのEFIパーティションにWindowsのEFIが捩じ込まれる。
EFIパーティションの`type`をEFI領域以外にすると、Windowsは自前でEFIパーティションを用意してくれる。
これはUEFIによるかもしれないが、EFIパーティションの`type`がEFI領域でなくとも普通に起動した。
パーティションの操作には`cfdisk`を勧めている。

