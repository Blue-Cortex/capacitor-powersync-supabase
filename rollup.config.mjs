export default {
  input: 'dist/esm/index.js',
  output: [
    {
      file: 'dist/plugin.js',
      format: 'iife',
      name: 'capacitorPowerSyncSubasePlugin',
      globals: {
        '@capacitor/core': 'capacitorExports',
        '@powersync/web': 'powersyncWeb',
        '@supabase/supabase-js': 'supabase',
      },
      sourcemap: true,
      inlineDynamicImports: true,
    },
    {
      file: 'dist/plugin.cjs.js',
      format: 'cjs',
      sourcemap: true,
      inlineDynamicImports: true,
    },
  ],
  external: ['@capacitor/core', '@powersync/web', '@supabase/supabase-js'],
};
