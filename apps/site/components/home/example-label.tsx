import {
  Label,
  Text,
  Box,
  Code128,
  DataMatrix,
  build,
  mm,
  dots,
} from "zplkit/jsx";

const order = { id: 10442, shelf: "B_3", express: true };

/** The label shown on the home page, built with zplkit's JSX */
export const exampleLabel = build(
  <Label width={mm(101.6)} height={mm(50.8)} dpmm={8}>
    <Text x={mm(5)} y={mm(5)} height={mm(7)}>
      Harbor Parts Co.
    </Text>
    <Text x={mm(5)} y={mm(14)} height={mm(4)}>
      Order #{order.id} · Shelf {order.shelf}
    </Text>
    <Box
      x={mm(5)}
      y={mm(21)}
      width={mm(91)}
      height={dots(3)}
      thickness={dots(3)}
    />
    <Code128 x={mm(5)} y={mm(25)} height={mm(13)}>
      {`${order.id}-${order.shelf}`}
    </Code128>
    <DataMatrix x={mm(76)} y={mm(25)} moduleSize={dots(5)}>
      https://zpl.fingal.dev
    </DataMatrix>
    {order.express && (
      <Text x={mm(66)} y={mm(5)} height={mm(7)}>
        EXPRESS
      </Text>
    )}
  </Label>
);

/** The same label as shown in the code sample */
export const exampleSource = `const label = build(
  <Label width={mm(101.6)} height={mm(50.8)} dpmm={8}>
    <Text x={mm(5)} y={mm(5)} height={mm(7)}>
      Harbor Parts Co.
    </Text>
    <Text x={mm(5)} y={mm(14)} height={mm(4)}>
      Order #{order.id} · Shelf {order.shelf}
    </Text>
    <Box x={mm(5)} y={mm(21)} width={mm(91)}
         height={dots(3)} thickness={dots(3)} />
    <Code128 x={mm(5)} y={mm(25)} height={mm(13)}>
      {\`\${order.id}-\${order.shelf}\`}
    </Code128>
    <DataMatrix x={mm(76)} y={mm(25)} moduleSize={dots(5)}>
      https://zpl.fingal.dev
    </DataMatrix>
    {order.express && (
      <Text x={mm(66)} y={mm(5)} height={mm(7)}>EXPRESS</Text>
    )}
  </Label>
);

label.toZPL();`;
