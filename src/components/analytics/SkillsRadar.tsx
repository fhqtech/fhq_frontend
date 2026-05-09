import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from "recharts";

interface SkillsRadarProps {
  skills: { [key: string]: number };
}

export function SkillsRadar({ skills }: SkillsRadarProps) {
  const data = Object.entries(skills).map(([skill, value]) => ({
    skill: skill.length > 15 ? skill.substring(0, 15) + '...' : skill,
    value: value,
    fullSkill: skill
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="skill"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
        />
        <Radar
          name="Proficiency"
          dataKey="value"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.3}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
            color: 'hsl(var(--popover-foreground))'
          }}
          formatter={(value: number, name: string, props: any) => [
            `${value}%`,
            props.payload.fullSkill
          ]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
