let OpenAI = require('openai').OpenAI


module.exports = {

    fastAnswerMessages: async function (key, messages) {
        let openai = new OpenAI({apiKey: key});
        let completion = await openai.chat.completions.create({
            messages: messages,
            model: 'gpt-4',//"gpt-3.5-turbo",


        });
        return {data: completion.choices[0].message.content, id: completion.id}
    },

}
