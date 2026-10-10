import type { Surface } from '../render/Surface'

/** Short-lived bits in screen space: sparks, feathers, stars, hearts, crumbs. */
export interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    gravity: number
    life: number
    max: number
    color: string
    size: number
    sprite?: Surface
    /** A sprite pair flipped every few frames reads as a spin. */
    spin?: Surface
}

export class Particles {
    list: Particle[] = []

    add(particle: Partial<Particle> & { x: number; y: number }): void {
        const life = particle.life ?? 30
        this.list.push({
            vx: 0,
            vy: 0,
            gravity: 0.25,
            color: '#ffffff',
            size: 3,
            ...particle,
            life,
            max: life,
        })
    }

    burst(x: number, y: number, count: number, color: string, power = 5, size = 3): void {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2
            const speed = power * (0.4 + Math.random() * 0.6)
            this.add({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - power * 0.4,
                life: 18 + Math.random() * 16,
                color,
                size,
            })
        }
    }

    update(): void {
        for (const particle of this.list) {
            particle.x += particle.vx
            particle.y += particle.vy
            particle.vy += particle.gravity
            particle.life--
        }
        this.list = this.list.filter((particle) => particle.life > 0)
    }

    clear(): void {
        this.list = []
    }
}
