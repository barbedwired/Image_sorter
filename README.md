# Image_sorter


[![Live Demo](https://img.shields.io/badge/demo-online-emerald.svg)](https://barbedwired.github.io/Image_sorter/)
アイコンクリックででもページに飛びます。
ユーザーの主観的な好みを統計的に処理し、最適なランキングを導き出します。ブラッドリー・テリーモデルとベイズ的推論を基盤とした、高精度な多択式画像ソートエンジンです。





## 主な機能

* **多択選択式アルゴリズム**: 1対1ではなく、4枚から6枚の画像の中から直感的に「一番」を選ぶ形式。脳の疲労を抑えつつ、効率的なデータ収集が可能です。
* **エリート選抜（Freeze）機能**: 分析の過程で圧倒的な有意差が認められた個体を自動検知し、上位枠へ固定します。
* **不確実性（$\sigma$）の推定**: 各画像の評価の「ブレ」を数値化。評価が未確定なものを優先的に提示することで、最短手数での収束を実現します。
* **統計リザルト**: 測定完了後、適合率や不確実性の推移などの統計データと共に、Tier表形式で結果を表示します。

## 技術仕様

### 数理モデル
本ツールは、ペア比較データから項目の強さを推定する **ブラッドリー・テリーモデル (Bradley-Terry model)** をオンライン学習向けに拡張して採用しています。

$$P(i > j) = \frac{\alpha_i}{\alpha_i + \alpha_j}$$

このモデルに評価の不確実性を表す **$\sigma$ (Sigma)** パラメータを組み合わせることで、Glickoレーティングのような動的な学習率制御を行っています。



## 使い方

1. `index.html` をブラウザで開きます。
2. ソートしたい画像をドラッグ＆ドロップで追加します。
3. 表示される画像の中から、最も好ましいものをクリックして選択します。
4. 結果画面で、適合率に基づいた最終ランキングを確認できます。

### キーボードショートカット
* `1` 〜 `6`: 画像の選択
* `Backspace`: 1手戻る
* `Space`: 判断保留（パス）
* `Enter`: 終了して結果を表示

## ライセンス
 Sound Effects: Dentsu Free Sound Assets
 The source code of this project is licensed under the MIT License. However, the sound files located in the assets/ directory are not covered by this license. Redistribution or commercial use of these specific assets is prohibited.
