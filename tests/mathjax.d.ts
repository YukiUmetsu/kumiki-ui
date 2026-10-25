// MathJax 4 ships JavaScript without declarations. The adapter types its own structural interface, so this only
// declares the entry point the tests initialise.
declare module "mathjax" {
  const MathJax: { init(config: object): Promise<unknown> };
  export default MathJax;
}
