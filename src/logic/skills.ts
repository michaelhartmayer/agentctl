import path from 'path';

export interface SkillsContext {
    dirname: string;
}

export const SkillsLogic = {
    getSourcePaths(ctx: SkillsContext): string[] {
        return [
            path.resolve(ctx.dirname, '../../skills/agentctl/SKILL.md'),
            path.resolve(ctx.dirname, '../skills/agentctl/SKILL.md'),
            path.resolve(ctx.dirname, '../../../skills/agentctl/SKILL.md')
        ];
    },

    getTargetPath(targetDir: string, agent: string): string {
        const filename = agent === 'cursor' ? 'agentctl.md' : 'SKILL.md';
        return path.join(targetDir, filename);
    }
};
