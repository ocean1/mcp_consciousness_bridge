import { build } from 'esbuild';
import { glob } from 'glob';
import { readFileSync } from 'fs';
import path from 'path';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

// External dependencies that shouldn't be bundled
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

// Common build options
const commonOptions = {
  platform: 'node',
  target: 'node18',
  format: 'esm',
  logLevel: 'info',
  bundle: false, // Don't bundle dependencies
  sourcemap: true,
};

// Build function
async function buildProject(production = false) {
  console.log(`Building ${production ? 'production' : 'development'} version...`);
  
  // Get all TypeScript files
  const entryPoints = await glob('src/**/*.ts', {
    ignore: ['**/*.test.ts', '**/test/**']
  });
  
  const options = {
    ...commonOptions,
    entryPoints,
    outdir: 'dist',
    outbase: 'src',
  };
  
  if (production) {
    Object.assign(options, {
      minify: true,
      minifyWhitespace: true,
      minifySyntax: true,
      minifyIdentifiers: true,
      treeShaking: true,
      drop: ['debugger'],
      legalComments: 'none',
    });
  } else {
    Object.assign(options, {
      minify: false,
      keepNames: true,
    });
  }
  
  try {
    const result = await build(options);
    console.log('Build complete!');
    
    // Show file sizes in production
    if (production && result.metafile) {
      const outputs = Object.entries(result.metafile.outputs)
        .filter(([file]) => file.endsWith('.js'))
        .sort((a, b) => b[1].bytes - a[1].bytes);
        
      console.log('\nOutput files:');
      outputs.forEach(([file, info]) => {
        const size = (info.bytes / 1024).toFixed(2);
        console.log(`  ${path.basename(file)}: ${size} KB`);
      });
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const isProduction = args.includes('--prod') || args.includes('--production');

// Run build
buildProject(isProduction);