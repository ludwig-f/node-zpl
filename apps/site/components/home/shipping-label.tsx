import {
  Label,
  Text,
  Box,
  Code128,
  DataMatrix,
  QrCode,
  Raw,
  build,
  dots,
  mm,
} from "@zplkit/core/jsx";

/** 4 × 6 in at 203 dpi: 812 × 1218 dots */
export const shippingLabelSize = {
  widthMm: 101.5,
  heightMm: 152.25,
  dpmm: 8 as const,
};

const order = {
  name: "AMARA OKAFOR",
  street: "41 HARBOUR ST",
  city: "GLASGOW G1 4QE",
  route: "G1 4QE",
  tracking: "1ZK4F9W82034417",
};

const Line = ({ y, thickness }: { y: number; thickness: number }) => (
  <Box
    x={dots(36)}
    y={dots(y)}
    width={dots(740)}
    height={dots(thickness)}
    thickness={dots(thickness)}
  />
);

/** The shipping label on the home page, built with zplkit's JSX */
export const shippingLabel = build(
  <Label
    width={mm(shippingLabelSize.widthMm)}
    height={mm(shippingLabelSize.heightMm)}
    dpmm={shippingLabelSize.dpmm}
  >
    <Text x={dots(36)} y={dots(40)} height={dots(26)}>
      FROM: HARBOR PARTS CO.
    </Text>
    <Text x={dots(36)} y={dots(72)} height={dots(26)}>
      12 DOCK RD, UNIT 4
    </Text>
    <Text x={dots(36)} y={dots(104)} height={dots(26)}>
      LEEDS LS9 0AB
    </Text>
    <Box
      x={dots(652)}
      y={dots(28)}
      width={dots(124)}
      height={dots(124)}
      thickness={dots(124)}
    />
    {/* A priority mark: the letter reverses the box under it */}
    <Raw zpl="^FO676,40^FR^A0N,118,104^FDP^FS" />
    <Line y={170} thickness={6} />

    <Text x={dots(36)} y={dots(192)} height={dots(26)}>
      SHIP TO
    </Text>
    <Text x={dots(36)} y={dots(226)} height={dots(60)}>
      {order.name}
    </Text>
    <Text x={dots(36)} y={dots(292)} height={dots(42)}>
      {order.street}
    </Text>
    <Text x={dots(36)} y={dots(338)} height={dots(42)}>
      {order.city}
    </Text>
    <Line y={398} thickness={3} />

    <DataMatrix x={dots(40)} y={dots(420)} moduleSize={dots(8)}>
      {`ZK-55821-${order.tracking}`}
    </DataMatrix>
    <Text x={dots(250)} y={dots(428)} height={dots(110)}>
      {order.route}
    </Text>
    <Text x={dots(254)} y={dots(548)} height={dots(30)}>
      PKG 1 OF 2 · ZONE 07
    </Text>
    <Line y={604} thickness={6} />

    <Text x={dots(36)} y={dots(626)} height={dots(24)}>
      TRACKING #
    </Text>
    {/* Wider bars than the default 2 dots, to fill the label */}
    <Raw zpl="^BY3" />
    <Code128 x={dots(70)} y={dots(664)} height={dots(200)}>
      {order.tracking}
    </Code128>
    <Line y={936} thickness={3} />

    <QrCode x={dots(32)} y={dots(946)} moduleSize={dots(6)}>
      {`QA,https://zplkit.fingal.dev/t/${order.tracking}`}
    </QrCode>
    <Text x={dots(290)} y={dots(990)} height={dots(32)}>
      WEIGHT 2.4 KG
    </Text>
    <Text x={dots(290)} y={dots(1034)} height={dots(32)}>
      REF PO-55821
    </Text>
    <Text x={dots(290)} y={dots(1078)} height={dots(32)}>
      SHIP 2026-10-24
    </Text>
  </Label>
);
