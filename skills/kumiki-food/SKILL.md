---
name: kumiki-food
description: Use when drawing, painting, animating or reviewing food in Kumiki in any art style (meat, eggs, toast and bread, rice, sushi, ramen, dango, tempura, fruit, steam), especially when cooked food is coloured by guesswork (a steak pink to the edges, an egg yolk that does not match the boiling time), browning is even, steam looks like smoke or puffs from the surface, or every food has the same gloss.
---

# Kumiki food (FOOD1)

Read the [spec](../../docs/component-specs/food.md).

1. **Colour follows the heat.**
   - Use `cookSteak`, `cookEgg` and `toastBrowning` rather than painting doneness by eye.
   - A steak's cut face runs from crust to grey band to pink to a red centre.
   - An egg boiled 6 min from the fridge has a runny yolk; 7–7.5 jammy; 10 hard; 13 adds a grey-green ring.
2. **Browning is uneven.** It is darker at edges and on raised crumb, and starts above about 140 °C (Maillard).
3. **Gloss by food** (`FOOD_GLOSS`): glazes are sharp, rice softly speckled, bread crust dull.
4. **Steam** is invisible at the surface and white a centimetre or two up. It rises about 0.4 m/s, curls and thins
   within about 15 cm, and shows best backlit against the dark (`Steam`).
5. **Size the dish** (`DISHES`): onigiri sides 7–9 cm, a ramen bowl 18–22 cm.
6. **Render or reference** with `renderFood` / `FoodView`. Record what you checked.
