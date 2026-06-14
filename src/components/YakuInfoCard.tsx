import { createTile, type Tile, type YakuHint } from '../gameEngine'
import { getYakuCurrentReason, YAKU_INFO } from '../yakuInfo'
import { TileView } from './TileView'

interface YakuInfoCardProps {
  hint: YakuHint
  hand: Tile[]
}

export function YakuInfoCard({ hint, hand }: YakuInfoCardProps) {
  const info = YAKU_INFO[hint]
  return (
    <article className="yaku-info-card">
      <h4>{info.name}</h4>
      <p>{info.description} {info.condition}</p>
      <p className="yaku-current">{getYakuCurrentReason(hint, hand)}</p>
      <div className="yaku-examples">
        {info.examples.map((row, rowIndex) => (
          <div className="yaku-example-row" key={`${hint}-${row.label}-${rowIndex}`}>
            <span className={`example-label ${row.tone ?? 'neutral'}`}>{row.label}</span>
            <div className="example-groups">
              {row.groups.map((group, groupIndex) => (
                <div className="example-group" key={`${rowIndex}-${groupIndex}`}>
                  {group.map((code, tileIndex) => (
                    <TileView
                      key={`${code}-${tileIndex}`}
                      tile={createTile(code, `yaku-${hint}-${rowIndex}-${groupIndex}-${tileIndex}`)}
                      tiny
                    />
                  ))}
                </div>
              ))}
              {row.suffix && <small>{row.suffix}</small>}
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
