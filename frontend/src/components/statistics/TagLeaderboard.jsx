import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Heart, Users, MapPin, Package, Activity, Cloud } from 'lucide-react';

const TagLeaderboard = ({ data = {} }) => {
    const tagTypeConfig = {
        emotion: { label: '情感', icon: Heart, color: 'bg-red-500' },
        character: { label: '角色', icon: Users, color: 'bg-blue-500' },
        location: { label: '地点', icon: MapPin, color: 'bg-green-500' },
        object: { label: '物体', icon: Package, color: 'bg-yellow-500' },
        action: { label: '行为', icon: Activity, color: 'bg-purple-500' },
        weather: { label: '天气', icon: Cloud, color: 'bg-cyan-500' },
    };

    // 获取有数据的标签类型
    const availableTypes = Object.keys(data).filter(
        (type) => data[type] && data[type].length > 0
    );

    if (availableTypes.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        标签排行榜
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                        暂无标签数据
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    标签排行榜
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue={availableTypes[0]} className="w-full">
                    <TabsList className="grid w-full" style={{
                        gridTemplateColumns: `repeat(${Math.min(availableTypes.length, 4)}, 1fr)`
                    }}>
                        {availableTypes.map((type) => {
                            const config = tagTypeConfig[type];
                            if (!config) return null;
                            const Icon = config.icon;

                            return (
                                <TabsTrigger
                                    key={type}
                                    value={type}
                                    className="flex items-center gap-1"
                                >
                                    <Icon className="h-3 w-3" />
                                    <span className="text-xs">{config.label}</span>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    {availableTypes.map((type) => {
                        const config = tagTypeConfig[type];
                        const tags = data[type] || [];

                        return (
                            <TabsContent key={type} value={type} className="mt-4 space-y-3">
                                {tags.length > 0 ? (
                                    tags.map((tag, index) => (
                                        <div
                                            key={`${tag.name}-${index}`}
                                            className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`
                                                    flex items-center justify-center 
                                                    w-8 h-8 rounded-full text-white font-bold text-sm
                                                    ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                                                        index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                                                            index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                                                                'bg-muted-foreground/50'}
                                                `}>
                                                    {index + 1}
                                                </span>
                                                <span className="font-medium">{tag.name}</span>
                                            </div>
                                            <Badge variant="secondary" className="ml-2">
                                                {tag.count} 次
                                            </Badge>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-center py-4">
                                        暂无数据
                                    </p>
                                )}
                            </TabsContent>
                        );
                    })}
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default TagLeaderboard;
