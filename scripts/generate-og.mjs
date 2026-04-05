import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'fs'

const interBold = readFileSync(new URL('../node_modules/@fontsource/inter/files/inter-latin-700-normal.woff', import.meta.url))
const interRegular = readFileSync(new URL('../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff', import.meta.url))

const svg = await satori(
  {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
        fontFamily: 'Inter',
        color: '#e8e8ef',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '24px',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '72px',
                    fontWeight: 700,
                    color: '#e94560',
                    letterSpacing: '-2px',
                  },
                  children: 'swedle',
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: '28px',
              color: '#8888a0',
              marginBottom: '40px',
              textAlign: 'center',
            },
            children: 'Daily SWE Diagnostic Puzzle',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              gap: '10px',
              marginBottom: '40px',
            },
            children: [
              '#e94560', '#e94560', '#00b894', '#2a2a3e', '#2a2a3e', '#2a2a3e'
            ].map(color => ({
              type: 'div',
              props: {
                style: {
                  width: '44px',
                  height: '44px',
                  borderRadius: '6px',
                  background: color,
                },
              },
            })),
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              maxWidth: '800px',
            },
            children: [
              'SRE Book', 'Martin Fowler', '12 Factor App', 'DDIA'
            ].map(source => ({
              type: 'div',
              props: {
                style: {
                  fontSize: '16px',
                  color: '#8888a0',
                  background: '#1a1a2e',
                  border: '1px solid #2a2a3e',
                  padding: '6px 16px',
                  borderRadius: '20px',
                },
                children: source,
              },
            })),
          },
        },
      ],
    },
  },
  {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
      { name: 'Inter', data: interBold, weight: 700, style: 'normal' },
    ],
  }
)

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
})
const png = resvg.render().asPng()
writeFileSync('public/og.png', png)
console.log('Generated public/og.png')
